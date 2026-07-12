import { Patient, Doctor, Appointment, Invoice, Payment, User, PharmacyItem, StockBatch, SupplyItem, Bed, Admission, TestOrder } from '../../models';
import { Op } from 'sequelize';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PatientDemographicsReport {
  totalPatients: number;
  genderDistribution: { [key: string]: number };
  ageDistribution: { [key: string]: number };
  registrationTrends: { month: string; count: number }[];
}

interface DoctorPerformanceReport {
  doctorId: string;
  doctorName: string;
  specialization: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completionRate: number;
  averageConsultationFee: number;
  totalRevenue: number;
  patientSatisfactionScore?: number;
}

interface FinancialReport {
  period: string;
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averageInvoiceAmount: number;
  paymentMethodBreakdown: { [key: string]: { amount: number; count: number } };
  revenueByDoctor: { doctorId: string; doctorName: string; revenue: number }[];
}

interface AppointmentAnalyticsReport {
  period: string;
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  cancellationRate: number;
  averageAppointmentsPerDay: number;
  peakHours: { hour: number; count: number }[];
  appointmentsBySpecialization: { specialization: string; count: number }[];
}

export const reportsService = {
  getPatientDemographicsReport: async (dateRange?: DateRange): Promise<PatientDemographicsReport> => {
    try {
      const whereConditions: any = { deleted_at: null };
      
      if (dateRange) {
        whereConditions.created_at = {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        };
      }

      // Total patients
      const totalPatients = await Patient.count({ where: whereConditions });

      // Gender distribution
      const genderDistribution = await Patient.findAll({
        attributes: [
          'gender',
          [Patient.sequelize!.fn('COUNT', Patient.sequelize!.col('id')), 'count']
        ],
        where: whereConditions,
        group: ['gender'],
        raw: true
      });

      const genderBreakdown = genderDistribution.reduce((acc: any, item: any) => {
        acc[item.gender || 'unspecified'] = parseInt(item.count);
        return acc;
      }, {});

      // Age distribution
      const patients = await Patient.findAll({
        attributes: ['date_of_birth'],
        where: whereConditions,
        raw: true
      });

      const ageBreakdown = patients.reduce((acc: any, patient: any) => {
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        let ageGroup;
        
        if (age < 18) ageGroup = '0-17';
        else if (age < 30) ageGroup = '18-29';
        else if (age < 50) ageGroup = '30-49';
        else if (age < 65) ageGroup = '50-64';
        else ageGroup = '65+';

        acc[ageGroup] = (acc[ageGroup] || 0) + 1;
        return acc;
      }, {});

      // Registration trends (last 12 months)
      const registrationTrends = await Patient.findAll({
        attributes: [
          [Patient.sequelize!.fn('DATE_TRUNC', 'month', Patient.sequelize!.col('created_at')), 'month'],
          [Patient.sequelize!.fn('COUNT', Patient.sequelize!.col('id')), 'count']
        ],
        where: {
          ...whereConditions,
          created_at: {
            [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        },
        group: [Patient.sequelize!.fn('DATE_TRUNC', 'month', Patient.sequelize!.col('created_at'))],
        order: [[Patient.sequelize!.fn('DATE_TRUNC', 'month', Patient.sequelize!.col('created_at')), 'ASC']],
        raw: true
      });

      const trends = registrationTrends.map((item: any) => ({
        month: new Date(item.month).toISOString().substring(0, 7),
        count: parseInt(item.count)
      }));

      return {
        totalPatients,
        genderDistribution: genderBreakdown,
        ageDistribution: ageBreakdown,
        registrationTrends: trends
      };
    } catch (error) {
      console.error('Get patient demographics report error:', error);
      throw error;
    }
  },

  getDoctorPerformanceReport: async (
    dateRange?: DateRange,
    doctorId?: string,
    paginationQuery?: PaginationQuery
  ): Promise<{ doctors: DoctorPerformanceReport[]; count: number; page?: number; limit?: number }> => {
    try {
      const paginationOptions = paginationQuery ? PaginationUtil.parsePaginationQuery(paginationQuery) : null;

      const whereConditions: any = { deleted_at: null };
      const appointmentWhereConditions: any = { deleted_at: null };
      
      if (doctorId) {
        whereConditions.id = doctorId;
      }

      if (dateRange) {
        appointmentWhereConditions.appointment_date = {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        };
      }

      const doctors = await Doctor.findAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name']
          },
          {
            model: Appointment,
            as: 'appointments',
            where: appointmentWhereConditions,
            required: false,
            attributes: ['id', 'status', 'appointment_date']
          }
        ],
        ...(paginationOptions ? PaginationUtil.getSequelizePagination(paginationOptions) : {})
      });

      const doctorReports: DoctorPerformanceReport[] = [];

      for (const doctor of doctors) {
        const appointments = doctor.appointments || [];
        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter((apt: any) => apt.status === 'completed').length;
        const cancelledAppointments = appointments.filter((apt: any) => apt.status === 'cancelled').length;
        const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

        // Calculate revenue from completed appointments
        const completedAppointmentIds = appointments
          .filter((apt: any) => apt.status === 'completed')
          .map((apt: any) => apt.id);

        let totalRevenue = 0;
        let averageConsultationFee = 0;

        if (completedAppointmentIds.length > 0) {
          const revenueData = await Payment.findAll({
            include: [
              {
                model: Invoice,
                as: 'invoice',
                where: {
                  appointment_id: { [Op.in]: completedAppointmentIds }
                },
                attributes: []
              }
            ],
            where: {
              payment_status: 'completed'
            },
            attributes: [
              [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'total_revenue'],
              [Payment.sequelize!.fn('AVG', Payment.sequelize!.col('amount')), 'avg_fee']
            ],
            raw: true
          });

          if (revenueData.length > 0 && revenueData[0]) {
            totalRevenue = parseFloat((revenueData[0] as any).total_revenue) || 0;
            averageConsultationFee = parseFloat((revenueData[0] as any).avg_fee) || 0;
          }
        }

        doctorReports.push({
          doctorId: doctor.id,
          doctorName: `${doctor.user?.first_name || ''} ${doctor.user?.last_name || ''}`.trim(),
          specialization: doctor.specialization,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          completionRate: Math.round(completionRate * 100) / 100,
          averageConsultationFee: Math.round(averageConsultationFee * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100
        });
      }

      const totalCount = doctorId ? 1 : await Doctor.count({ where: whereConditions });

      return {
        doctors: doctorReports,
        count: totalCount,
        ...(paginationOptions && {
          page: paginationOptions.page,
          limit: paginationOptions.limit
        })
      };
    } catch (error) {
      console.error('Get doctor performance report error:', error);
      throw error;
    }
  },

  getFinancialReport: async (dateRange?: DateRange): Promise<FinancialReport> => {
    try {
      const whereConditions: any = { deleted_at: null };
      const paymentWhereConditions: any = { deleted_at: null };
      
      if (dateRange) {
        whereConditions.created_at = {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        };
        paymentWhereConditions.payment_date = {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        };
      }

      // Invoice statistics
      const invoiceStats = await Invoice.findAll({
        attributes: [
          [Invoice.sequelize!.fn('COUNT', Invoice.sequelize!.col('id')), 'total_invoices'],
          [Invoice.sequelize!.fn('COUNT', Invoice.sequelize!.literal(`CASE WHEN payment_status = 'paid' THEN 1 END`)), 'paid_invoices'],
          [Invoice.sequelize!.fn('COUNT', Invoice.sequelize!.literal(`CASE WHEN payment_status = 'pending' THEN 1 END`)), 'pending_invoices'],
          [Invoice.sequelize!.fn('COUNT', Invoice.sequelize!.literal(`CASE WHEN payment_status = 'overdue' THEN 1 END`)), 'overdue_invoices'],
          [Invoice.sequelize!.fn('AVG', Invoice.sequelize!.col('total_amount')), 'avg_amount']
        ],
        where: whereConditions,
        raw: true
      });

      const stats = (invoiceStats[0] as any) || {};

      // Total revenue from completed payments
      const revenueData = await Payment.findAll({
        attributes: [
          [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'total_revenue']
        ],
        where: {
          ...paymentWhereConditions,
          payment_status: 'completed'
        },
        raw: true
      });

      const totalRevenue = parseFloat((revenueData[0] as any)?.total_revenue) || 0;

      // Payment method breakdown
      const paymentMethodBreakdown = await Payment.findAll({
        attributes: [
          'payment_method',
          [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'amount'],
          [Payment.sequelize!.fn('COUNT', Payment.sequelize!.col('id')), 'count']
        ],
        where: {
          ...paymentWhereConditions,
          payment_status: 'completed'
        },
        group: ['payment_method'],
        raw: true
      });

      const methodBreakdown = paymentMethodBreakdown.reduce((acc: any, item: any) => {
        acc[item.payment_method] = {
          amount: parseFloat(item.amount) || 0,
          count: parseInt(item.count) || 0
        };
        return acc;
      }, {});

      // Revenue by doctor
      const revenueByDoctor = await Payment.findAll({
        attributes: [
          [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'revenue']
        ],
        include: [
          {
            model: Invoice,
            as: 'invoice',
            include: [
              {
                model: Appointment,
                as: 'appointment',
                include: [
                  {
                    model: Doctor,
                    as: 'doctor',
                    include: [
                      {
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        where: {
          ...paymentWhereConditions,
          payment_status: 'completed'
        },
        group: ['invoice.appointment.doctor.id', 'invoice.appointment.doctor.user.first_name', 'invoice.appointment.doctor.user.last_name'],
        raw: true
      });

      const doctorRevenue = revenueByDoctor.map((item: any) => ({
        doctorId: item['invoice.appointment.doctor.id'],
        doctorName: `${item['invoice.appointment.doctor.user.first_name']} ${item['invoice.appointment.doctor.user.last_name']}`,
        revenue: parseFloat(item.revenue) || 0
      }));

      const period = dateRange 
        ? `${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}`
        : 'All time';

      return {
        period,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalInvoices: parseInt(stats.total_invoices) || 0,
        paidInvoices: parseInt(stats.paid_invoices) || 0,
        pendingInvoices: parseInt(stats.pending_invoices) || 0,
        overdueInvoices: parseInt(stats.overdue_invoices) || 0,
        averageInvoiceAmount: Math.round((parseFloat(stats.avg_amount) || 0) * 100) / 100,
        paymentMethodBreakdown: methodBreakdown,
        revenueByDoctor: doctorRevenue
      };
    } catch (error) {
      console.error('Get financial report error:', error);
      throw error;
    }
  },

  getAppointmentAnalyticsReport: async (dateRange?: DateRange): Promise<AppointmentAnalyticsReport> => {
    try {
      const whereConditions: any = { deleted_at: null };
      
      if (dateRange) {
        whereConditions.appointment_date = {
          [Op.between]: [dateRange.startDate, dateRange.endDate]
        };
      }

      // Appointment statistics
      const appointmentStats = await Appointment.findAll({
        attributes: [
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.col('id')), 'total_appointments'],
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.literal(`CASE WHEN status = 'scheduled' THEN 1 END`)), 'scheduled_appointments'],
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.literal(`CASE WHEN status = 'completed' THEN 1 END`)), 'completed_appointments'],
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelled_appointments'],
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.literal(`CASE WHEN status = 'no_show' THEN 1 END`)), 'no_show_appointments']
        ],
        where: whereConditions,
        raw: true
      });

      const stats = (appointmentStats[0] as any) || {};
      const totalAppointments = parseInt(stats.total_appointments) || 0;
      const scheduledAppointments = parseInt(stats.scheduled_appointments) || 0;
      const completedAppointments = parseInt(stats.completed_appointments) || 0;
      const cancelledAppointments = parseInt(stats.cancelled_appointments) || 0;
      const noShowAppointments = parseInt(stats.no_show_appointments) || 0;

      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
      const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

      // Calculate average appointments per day
      let averageAppointmentsPerDay = 0;
      if (dateRange) {
        const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
        averageAppointmentsPerDay = daysDiff > 0 ? totalAppointments / daysDiff : 0;
      }

      // Peak hours analysis - simplified for compatibility
      const peakHours = await Appointment.findAll({
        attributes: [
          [Appointment.sequelize!.fn('HOUR', Appointment.sequelize!.col('appointment_time')), 'hour'],
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.col('id')), 'count']
        ],
        where: whereConditions,
        group: [Appointment.sequelize!.fn('HOUR', Appointment.sequelize!.col('appointment_time'))],
        order: [[Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.col('id')), 'DESC']],
        limit: 5,
        raw: true
      });

      const hourlyBreakdown = peakHours.map((item: any) => ({
        hour: parseInt(item.hour),
        count: parseInt(item.count)
      }));

      // Appointments by specialization
      const appointmentsBySpecialization = await Appointment.findAll({
        attributes: [
          [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.col('appointments.id')), 'count']
        ],
        include: [
          {
            model: Doctor,
            as: 'doctor',
            attributes: ['specialization']
          }
        ],
        where: whereConditions,
        group: ['doctor.specialization'],
        raw: true
      });

      const specializationBreakdown = appointmentsBySpecialization.map((item: any) => ({
        specialization: item['doctor.specialization'],
        count: parseInt(item.count)
      }));

      const period = dateRange 
        ? `${dateRange.startDate.toISOString().split('T')[0]} to ${dateRange.endDate.toISOString().split('T')[0]}`
        : 'All time';

      return {
        period,
        totalAppointments,
        scheduledAppointments: parseInt(stats.scheduled_appointments) || 0,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments: parseInt(stats.no_show_appointments) || 0,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        averageAppointmentsPerDay: Math.round(averageAppointmentsPerDay * 100) / 100,
        peakHours: hourlyBreakdown,
        appointmentsBySpecialization: specializationBreakdown
      };
    } catch (error) {
      console.error('Get appointment analytics report error:', error);
      throw error;
    }
  },

  /**
   * Inventory valuation across pharmacy stock (batch-level) and medical
   * supplies (quantity on hand). Pharmacy is valued at cost (batch cost_price,
   * falling back to the item's unit_price) and at retail (unit_price); supplies
   * are valued at unit_price. Grouped by category with grand totals.
   */
  getInventoryValuationReport: async (tenantId: string) => {
    try {
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

      // ── Pharmacy ────────────────────────────────────────────────────────────
      const pharmacyItems = await PharmacyItem.findAll({
        where: { tenant_id: tenantId, is_active: true },
        include: [{ model: StockBatch, as: 'batches', attributes: ['quantity', 'cost_price'] }]
      });

      const pharmacyLines = pharmacyItems.map((it: any) => {
        const unitPrice = parseFloat(it.unit_price?.toString() || '0');
        let quantity = 0, costValue = 0;
        for (const b of (it.batches || [])) {
          const q = b.quantity || 0;
          const unitCost = b.cost_price != null ? parseFloat(b.cost_price.toString()) : unitPrice;
          quantity += q;
          costValue += q * unitCost;
        }
        return {
          id: it.id, name: it.name, sku: it.sku, category: it.category,
          quantity, unit_price: unitPrice,
          cost_value: round2(costValue),
          retail_value: round2(quantity * unitPrice)
        };
      });

      // ── Supplies ────────────────────────────────────────────────────────────
      const supplyItems = await SupplyItem.findAll({ where: { tenant_id: tenantId, is_active: true } });
      const supplyLines = supplyItems.map((it: any) => {
        const unitPrice = parseFloat(it.unit_price?.toString() || '0');
        const quantity = it.on_hand || 0;
        return {
          id: it.id, name: it.name, sku: it.sku, category: it.category,
          quantity, unit_price: unitPrice,
          value: round2(quantity * unitPrice)
        };
      });

      const byCategory = (lines: any[], valueKey: string) => {
        const acc: Record<string, { quantity: number; value: number; items: number }> = {};
        for (const l of lines) {
          const c = l.category || 'uncategorized';
          if (!acc[c]) acc[c] = { quantity: 0, value: 0, items: 0 };
          acc[c].quantity += l.quantity;
          acc[c].value = round2(acc[c].value + (l[valueKey] || 0));
          acc[c].items += 1;
        }
        return acc;
      };

      const pharmacyCost = round2(pharmacyLines.reduce((s, l) => s + l.cost_value, 0));
      const pharmacyRetail = round2(pharmacyLines.reduce((s, l) => s + l.retail_value, 0));
      const suppliesValue = round2(supplyLines.reduce((s, l) => s + l.value, 0));

      return {
        generated_at: new Date().toISOString(),
        pharmacy: {
          item_count: pharmacyLines.length,
          total_cost_value: pharmacyCost,
          total_retail_value: pharmacyRetail,
          by_category: byCategory(pharmacyLines, 'cost_value'),
          items: pharmacyLines
        },
        supplies: {
          item_count: supplyLines.length,
          total_value: suppliesValue,
          by_category: byCategory(supplyLines, 'value'),
          items: supplyLines
        },
        totals: {
          grand_total_cost: round2(pharmacyCost + suppliesValue),
          grand_total_retail: round2(pharmacyRetail + suppliesValue)
        }
      };
    } catch (error) {
      console.error('Get inventory valuation report error:', error);
      throw error;
    }
  },

  /**
   * Operational metrics: appointment no-show/cancellation/completion rates and
   * average wait time, bed occupancy + length of stay, lab turnaround, and
   * doctor utilization. Date-range filtered (global, consistent with the other
   * reports — appointments/lab orders are not tenant-scoped in the schema).
   */
  getOperationalMetricsReport: async (dateRange?: DateRange) => {
    try {
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
      const pct = (num: number, den: number) => (den > 0 ? round2((num / den) * 100) : 0);

      // ── Appointments ────────────────────────────────────────────────────────
      const apptWhere: any = {};
      if (dateRange) {
        apptWhere.appointment_date = {
          [Op.between]: [dateRange.startDate.toISOString().split('T')[0], dateRange.endDate.toISOString().split('T')[0]]
        };
      }
      const appts = await Appointment.findAll({
        where: apptWhere,
        attributes: ['status', 'checked_in_at', 'started_at', 'doctor_id', 'duration_minutes'],
        raw: true
      });

      const total = appts.length;
      const byStatus: Record<string, number> = {};
      let waitSum = 0, waitCount = 0;
      for (const a of appts as any[]) {
        byStatus[a.status] = (byStatus[a.status] || 0) + 1;
        if (a.checked_in_at && a.started_at) {
          const w = (new Date(a.started_at).getTime() - new Date(a.checked_in_at).getTime()) / 60000;
          if (w >= 0) { waitSum += w; waitCount++; }
        }
      }
      const appointments = {
        total,
        by_status: byStatus,
        no_show_rate: pct(byStatus['no_show'] || 0, total),
        cancellation_rate: pct(byStatus['cancelled'] || 0, total),
        completion_rate: pct(byStatus['completed'] || 0, total),
        average_wait_minutes: waitCount > 0 ? round2(waitSum / waitCount) : 0,
        wait_sample_size: waitCount
      };

      // ── Bed occupancy ─────────────────────────────────────────────────────────
      const [totalBeds, occupiedBeds] = await Promise.all([
        Bed.count({ where: { is_active: true } }),
        Bed.count({ where: { status: 'occupied' } })
      ]);
      const admWhere: any = {};
      if (dateRange) admWhere.admitted_at = { [Op.between]: [dateRange.startDate, dateRange.endDate] };
      const admissionsInRange = await Admission.count({ where: admWhere });
      const dischargedWhere: any = { status: 'discharged' };
      if (dateRange) dischargedWhere.discharged_at = { [Op.between]: [dateRange.startDate, dateRange.endDate] };
      const discharged = await Admission.findAll({ where: dischargedWhere, attributes: ['admitted_at', 'discharged_at'], raw: true });
      let losSum = 0, losCount = 0;
      for (const d of discharged as any[]) {
        if (d.admitted_at && d.discharged_at) {
          const days = (new Date(d.discharged_at).getTime() - new Date(d.admitted_at).getTime()) / 86400000;
          if (days >= 0) { losSum += days; losCount++; }
        }
      }
      const beds = {
        total_beds: totalBeds,
        occupied_beds: occupiedBeds,
        occupancy_rate: pct(occupiedBeds, totalBeds),
        admissions_in_period: admissionsInRange,
        discharges_in_period: losCount,
        average_length_of_stay_days: losCount > 0 ? round2(losSum / losCount) : 0
      };

      // ── Lab turnaround (order → results available) ───────────────────────────
      const orderWhere: any = { results_available_at: { [Op.ne]: null } };
      if (dateRange) orderWhere.created_at = { [Op.between]: [dateRange.startDate, dateRange.endDate] };
      const orders = await TestOrder.findAll({ where: orderWhere, attributes: ['created_at', 'results_available_at'], raw: true });
      let tSum = 0, tMin = Infinity, tMax = 0, tCount = 0;
      for (const o of orders as any[]) {
        const hrs = (new Date(o.results_available_at).getTime() - new Date(o.created_at).getTime()) / 3600000;
        if (hrs >= 0) { tSum += hrs; tMin = Math.min(tMin, hrs); tMax = Math.max(tMax, hrs); tCount++; }
      }
      const lab_turnaround = {
        completed_orders: tCount,
        average_hours: tCount > 0 ? round2(tSum / tCount) : 0,
        min_hours: tCount > 0 ? round2(tMin) : 0,
        max_hours: tCount > 0 ? round2(tMax) : 0
      };

      // ── Doctor utilization ────────────────────────────────────────────────────
      // Booked minutes per doctor vs an assumed capacity (business days × 480 min).
      const perDoctor: Record<string, { booked_minutes: number; appointments: number; completed: number }> = {};
      for (const a of appts as any[]) {
        if (!a.doctor_id) continue;
        const d = perDoctor[a.doctor_id] || (perDoctor[a.doctor_id] = { booked_minutes: 0, appointments: 0, completed: 0 });
        d.booked_minutes += a.duration_minutes || 0;
        d.appointments += 1;
        if (a.status === 'completed') d.completed += 1;
      }

      // Capacity: only computable with a date range
      let businessDays = 0;
      if (dateRange) {
        for (let t = new Date(dateRange.startDate); t <= dateRange.endDate; t.setDate(t.getDate() + 1)) {
          const day = t.getDay();
          if (day !== 0 && day !== 6) businessDays++;
        }
      }
      const capacityMinutes = businessDays * 480; // 8h/business day

      const doctorIds = Object.keys(perDoctor);
      const doctors = doctorIds.length
        ? await Doctor.findAll({ where: { id: { [Op.in]: doctorIds } }, include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }] })
        : [];
      const nameById: Record<string, string> = {};
      for (const doc of doctors as any[]) {
        nameById[doc.id] = doc.user ? `Dr. ${doc.user.first_name || ''} ${doc.user.last_name || ''}`.trim() : doc.id;
      }
      const doctor_utilization = doctorIds.map(id => ({
        doctor_id: id,
        doctor_name: nameById[id] || id,
        appointments: perDoctor[id].appointments,
        completed: perDoctor[id].completed,
        booked_minutes: perDoctor[id].booked_minutes,
        utilization_rate: capacityMinutes > 0 ? pct(perDoctor[id].booked_minutes, capacityMinutes) : null
      })).sort((a, b) => b.booked_minutes - a.booked_minutes);

      return {
        generated_at: new Date().toISOString(),
        period: dateRange
          ? { startDate: dateRange.startDate.toISOString().split('T')[0], endDate: dateRange.endDate.toISOString().split('T')[0] }
          : null,
        appointments,
        beds,
        lab_turnaround,
        doctor_utilization,
        capacity_assumption: dateRange ? '8 working hours per business day' : 'utilization requires a date range'
      };
    } catch (error) {
      console.error('Get operational metrics report error:', error);
      throw error;
    }
  },

  /**
   * Time-series trends with period grouping (daily/weekly/monthly) and a
   * period-over-period delta. Metrics: revenue (completed payments), patients
   * (new registrations), appointments (by appointment date). Buckets are gap-
   * filled with zeros so the series is chart-ready.
   */
  getTrendsReport: async (opts: { metric: 'revenue' | 'patients' | 'appointments'; period: 'daily' | 'weekly' | 'monthly'; dateRange?: DateRange }) => {
    try {
      const metric = opts.metric;
      const period = opts.period;
      const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

      const end = opts.dateRange?.endDate ?? new Date();
      const start = opts.dateRange?.startDate ?? new Date(end.getTime() - 30 * 86400000);
      const windowMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - windowMs);

      // Bucket label for a date under the chosen period
      const bucketKey = (d: Date): string => {
        const dt = new Date(d);
        if (period === 'monthly') return dt.toISOString().slice(0, 7);           // YYYY-MM
        if (period === 'weekly') {                                                // ISO week start (Monday)
          const day = (dt.getUTCDay() + 6) % 7;
          const monday = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - day));
          return monday.toISOString().slice(0, 10);
        }
        return dt.toISOString().slice(0, 10);                                     // YYYY-MM-DD
      };

      // Fetch {date, value} rows for a metric over an arbitrary window
      const fetchRows = async (from: Date, to: Date): Promise<Array<{ date: Date; value: number }>> => {
        if (metric === 'revenue') {
          const rows = await Payment.findAll({
            where: { payment_status: 'completed', payment_date: { [Op.between]: [from, to] } },
            attributes: ['payment_date', 'amount'], raw: true
          });
          return (rows as any[]).map(r => ({ date: r.payment_date, value: parseFloat(r.amount?.toString() || '0') }));
        }
        if (metric === 'patients') {
          const rows = await Patient.findAll({
            where: { created_at: { [Op.between]: [from, to] } } as any,
            attributes: ['created_at'], raw: true
          });
          return (rows as any[]).map(r => ({ date: r.created_at, value: 1 }));
        }
        // appointments — by appointment_date (DATEONLY)
        const rows = await Appointment.findAll({
          where: { appointment_date: { [Op.between]: [from.toISOString().split('T')[0], to.toISOString().split('T')[0]] } },
          attributes: ['appointment_date'], raw: true
        });
        return (rows as any[]).map(r => ({ date: new Date(r.appointment_date), value: 1 }));
      };

      const currentRows = await fetchRows(start, end);

      // Aggregate into buckets
      const bucketTotals: Record<string, number> = {};
      let currentTotal = 0;
      for (const r of currentRows) {
        const k = bucketKey(r.date);
        bucketTotals[k] = round2((bucketTotals[k] || 0) + r.value);
        currentTotal = round2(currentTotal + r.value);
      }

      // Gap-fill buckets across the range
      const labels: string[] = [];
      const seen = new Set<string>();
      const cursor = new Date(start);
      while (cursor <= end) {
        const k = bucketKey(cursor);
        if (!seen.has(k)) { seen.add(k); labels.push(k); }
        if (period === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
        else if (period === 'weekly') cursor.setDate(cursor.getDate() + 7);
        else cursor.setDate(cursor.getDate() + 1);
      }
      const series = labels.map(label => ({ period: label, value: bucketTotals[label] || 0 }));

      // Period-over-period
      const prevRows = await fetchRows(prevStart, start);
      const previousTotal = round2(prevRows.reduce((s, r) => s + r.value, 0));
      const delta = round2(currentTotal - previousTotal);
      const deltaPct = previousTotal > 0 ? round2((delta / previousTotal) * 100) : null;

      return {
        metric,
        period,
        range: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
        series,
        summary: {
          total: currentTotal,
          previous_period_total: previousTotal,
          delta,
          delta_pct: deltaPct
        }
      };
    } catch (error) {
      console.error('Get trends report error:', error);
      throw error;
    }
  }
};