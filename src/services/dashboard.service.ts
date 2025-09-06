import { Appointment, Patient, Doctor, User, Invoice, Payment } from '../models';
import { Op } from 'sequelize';

interface DashboardStats {
  patients: {
    total: number;
    newThisMonth: number;
    activePatients: number;
  };
  doctors: {
    total: number;
    available: number;
    specializations: Array<{ specialization: string; count: number }>;
  };
  appointments: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: Array<{ status: string; count: number }>;
    upcomingToday: any[];
  };
  revenue: {
    totalRevenue: number;
    thisMonth: number;
    thisWeek: number;
    pendingAmount: number;
    byPaymentMethod: Array<{ method: string; amount: number; count: number }>;
  };
  recentActivity: {
    recentAppointments: any[];
    recentPayments: any[];
    recentRegistrations: any[];
  };
}

export const dashboardService = {
  /**
   * Get comprehensive dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Patient Statistics
      const totalPatients = await Patient.count({ where: { deleted_at: null } });
      const newPatientsThisMonth = await Patient.count({
        where: {
          created_at: { [Op.gte]: thisMonthStart },
          deleted_at: null
        }
      });
      
      const activePatientsCount = await Patient.count({
        where: {
          deleted_at: null
        },
        include: [{
          model: Appointment,
          as: 'appointments',
          where: {
            appointment_date: { [Op.gte]: thisMonthStart },
            status: { [Op.in]: ['scheduled', 'completed', 'confirmed'] }
          },
          required: true
        }]
      });

      // Doctor Statistics
      const totalDoctors = await Doctor.count({ where: { deleted_at: null } });
      const availableDoctors = await Doctor.count({
        where: { 
          is_available: true,
          deleted_at: null
        }
      });

      const doctorSpecializations = await Doctor.findAll({
        attributes: ['specialization', [Doctor.sequelize!.fn('COUNT', Doctor.sequelize!.col('id')), 'count']],
        where: { deleted_at: null },
        group: ['specialization'],
        raw: true
      });

      // Appointment Statistics
      const totalAppointments = await Appointment.count({ where: { deleted_at: null } });
      const appointmentsToday = await Appointment.count({
        where: {
          appointment_date: { [Op.between]: [today, tomorrow] },
          deleted_at: null
        }
      });
      
      const appointmentsThisWeek = await Appointment.count({
        where: {
          appointment_date: { [Op.gte]: thisWeekStart },
          deleted_at: null
        }
      });
      
      const appointmentsThisMonth = await Appointment.count({
        where: {
          appointment_date: { [Op.gte]: thisMonthStart },
          deleted_at: null
        }
      });

      const appointmentsByStatus = await Appointment.findAll({
        attributes: ['status', [Appointment.sequelize!.fn('COUNT', Appointment.sequelize!.col('id')), 'count']],
        where: { deleted_at: null },
        group: ['status'],
        raw: true
      });

      // Upcoming appointments today
      const upcomingToday = await Appointment.findAll({
        where: {
          appointment_date: { [Op.between]: [today, tomorrow] },
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          deleted_at: null
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['first_name', 'last_name', 'mrn']
          },
          {
            model: Doctor,
            as: 'doctor',
            include: [{
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name']
            }]
          }
        ],
        order: [['appointment_time', 'ASC']],
        limit: 10
      });

      // Revenue Statistics
      const totalRevenue = await Payment.sum('amount', {
        where: {
          payment_status: 'completed',
          deleted_at: null
        }
      }) || 0;

      const revenueThisMonth = await Payment.sum('amount', {
        where: {
          payment_status: 'completed',
          payment_date: { [Op.gte]: thisMonthStart },
          deleted_at: null
        }
      }) || 0;

      const revenueThisWeek = await Payment.sum('amount', {
        where: {
          payment_status: 'completed',
          payment_date: { [Op.gte]: thisWeekStart },
          deleted_at: null
        }
      }) || 0;

      const pendingAmount = await Invoice.sum('total_amount', {
        where: {
          payment_status: { [Op.in]: ['pending', 'partial', 'overdue'] },
          deleted_at: null
        }
      }) || 0;

      const revenueByPaymentMethod = await Payment.findAll({
        attributes: [
          'payment_method',
          [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'amount'],
          [Payment.sequelize!.fn('COUNT', Payment.sequelize!.col('id')), 'count']
        ],
        where: {
          payment_status: 'completed',
          deleted_at: null
        },
        group: ['payment_method'],
        raw: true
      });

      // Recent Activity
      const recentAppointments = await Appointment.findAll({
        where: { deleted_at: null },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['first_name', 'last_name', 'mrn']
          },
          {
            model: Doctor,
            as: 'doctor',
            include: [{
              model: User,
              as: 'user',
              attributes: ['first_name', 'last_name']
            }]
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      const recentPayments = await Payment.findAll({
        where: { deleted_at: null },
        include: [{
          model: Invoice,
          as: 'invoice',
          include: [{
            model: Patient,
            as: 'patient',
            attributes: ['first_name', 'last_name', 'mrn']
          }]
        }],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      const recentRegistrations = await Patient.findAll({
        where: { deleted_at: null },
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'phone']
        }],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      return {
        patients: {
          total: totalPatients,
          newThisMonth: newPatientsThisMonth,
          activePatients: activePatientsCount
        },
        doctors: {
          total: totalDoctors,
          available: availableDoctors,
          specializations: doctorSpecializations.map((item: any) => ({
            specialization: item.specialization,
            count: parseInt(item.count)
          }))
        },
        appointments: {
          total: totalAppointments,
          today: appointmentsToday,
          thisWeek: appointmentsThisWeek,
          thisMonth: appointmentsThisMonth,
          byStatus: appointmentsByStatus.map((item: any) => ({
            status: item.status,
            count: parseInt(item.count)
          })),
          upcomingToday: upcomingToday.map(apt => ({
            id: apt.id,
            time: apt.appointment_time,
            patient: `${apt.patient?.first_name} ${apt.patient?.last_name} (${apt.patient?.mrn})`,
            doctor: apt.doctor?.user ? `Dr. ${apt.doctor.user.first_name} ${apt.doctor.user.last_name}` : 'Unknown',
            status: apt.status,
            type: apt.appointment_type
          }))
        },
        revenue: {
          totalRevenue: parseFloat(totalRevenue.toString()),
          thisMonth: parseFloat(revenueThisMonth.toString()),
          thisWeek: parseFloat(revenueThisWeek.toString()),
          pendingAmount: parseFloat(pendingAmount.toString()),
          byPaymentMethod: revenueByPaymentMethod.map((item: any) => ({
            method: item.payment_method,
            amount: parseFloat(item.amount),
            count: parseInt(item.count)
          }))
        },
        recentActivity: {
          recentAppointments: recentAppointments.map(apt => ({
            id: apt.id,
            date: apt.appointment_date,
            time: apt.appointment_time,
            patient: `${apt.patient?.first_name} ${apt.patient?.last_name}`,
            doctor: apt.doctor?.user ? `Dr. ${apt.doctor.user.first_name} ${apt.doctor.user.last_name}` : 'Unknown',
            status: apt.status,
            createdAt: apt.createdAt
          })),
          recentPayments: recentPayments.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            method: payment.payment_method,
            status: payment.payment_status,
            patient: payment.invoice?.patient ? 
              `${payment.invoice.patient.first_name} ${payment.invoice.patient.last_name}` : 'Unknown',
            createdAt: payment.createdAt
          })),
          recentRegistrations: recentRegistrations.map(patient => ({
            id: patient.id,
            name: `${patient.first_name} ${patient.last_name}`,
            mrn: patient.mrn,
            email: patient.user?.email,
            phone: patient.user?.phone,
            createdAt: patient.createdAt
          }))
        }
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  },

  /**
   * Get system health metrics
   */
  getSystemHealth: async () => {
    try {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      // Database health metrics
      const dbStats = {
        totalRecords: {
          patients: await Patient.count(),
          doctors: await Doctor.count(),
          appointments: await Appointment.count(),
          invoices: await Invoice.count(),
          payments: await Payment.count()
        },
        activeConnections: 1, // This would need database-specific implementation
        avgResponseTime: '< 100ms' // This would need actual monitoring
      };

      // System performance metrics
      const performanceMetrics = {
        appointmentsCreated24h: await Appointment.count({
          where: {
            created_at: { [Op.gte]: yesterday }
          }
        }),
        paymentsProcessed24h: await Payment.count({
          where: {
            payment_status: 'completed',
            created_at: { [Op.gte]: yesterday }
          }
        }),
        avgAppointmentDuration: 30, // This would be calculated from actual data
        systemUptime: process.uptime()
      };

      return {
        status: 'healthy',
        database: dbStats,
        performance: performanceMetrics,
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error('Get system health error:', error);
      throw error;
    }
  },

  /**
   * Get revenue analytics for charts and reports
   */
  getRevenueAnalytics: async (period: 'week' | 'month' | 'year' = 'month') => {
    try {
      const now = new Date();
      let startDate: Date;
      let dateFormat: string;
      let groupBy: string;

      switch (period) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          dateFormat = '%Y-%m-%d';
          groupBy = 'DATE(payment_date)';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          dateFormat = '%Y-%m';
          groupBy = 'DATE_FORMAT(payment_date, "%Y-%m")';
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFormat = '%Y-%m-%d';
          groupBy = 'DATE(payment_date)';
      }

      const revenueData = await Payment.findAll({
        attributes: [
          [Payment.sequelize!.fn('DATE', Payment.sequelize!.col('payment_date')), 'period'],
          [Payment.sequelize!.fn('SUM', Payment.sequelize!.col('amount')), 'revenue'],
          [Payment.sequelize!.fn('COUNT', Payment.sequelize!.col('id')), 'transactions']
        ],
        where: {
          payment_status: 'completed',
          payment_date: { [Op.gte]: startDate },
          deleted_at: null
        },
        group: [Payment.sequelize!.fn('DATE', Payment.sequelize!.col('payment_date'))],
        order: [[Payment.sequelize!.fn('DATE', Payment.sequelize!.col('payment_date')), 'ASC']],
        raw: true
      });

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        data: revenueData.map((item: any) => ({
          period: item.period,
          revenue: parseFloat(item.revenue),
          transactions: parseInt(item.transactions)
        }))
      };
    } catch (error) {
      console.error('Get revenue analytics error:', error);
      throw error;
    }
  }
};