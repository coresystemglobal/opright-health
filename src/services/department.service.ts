import { Department as DepartmentModel } from '../models/department.model';
import { DepartmentStaff, DepartmentRole } from '../models/department-staff.model';
import { Doctor } from '../models/doctor.model';
import { User } from '../models/user.model';
import { Op, CreationAttributes } from 'sequelize';

interface CreateDepartmentDTO {
  code: string;
  name: string;
  description?: string;
  head_of_department_id?: string;
  operating_hours_start?: string;
  operating_hours_end?: string;
  bed_capacity?: number;
  location?: string;
  floor?: string;
  phone_extension?: string;
  email?: string;
  tenant_id: string;
}

interface AssignStaffDTO {
  department_id: string;
  user_id: string;
  role: DepartmentRole;
  start_date: Date;
  is_primary_department?: boolean;
  responsibilities?: string;
  notes?: string;
  tenant_id: string;
}

export class DepartmentService {
  // ============ DEPARTMENT MANAGEMENT ============

  static async createDepartment(data: CreateDepartmentDTO): Promise<DepartmentModel> {
    return await DepartmentModel.create(data as unknown as CreationAttributes<DepartmentModel>);
  }

  static async getAllDepartments(tenantId: string, activeOnly: boolean = true): Promise<DepartmentModel[]> {
    const where: any = { tenant_id: tenantId };
    if (activeOnly) {
      where.is_active = true;
    }

    return await DepartmentModel.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        { 
          association: 'head_of_department', 
          attributes: ['id', 'specialization'],
          include: [{ association: 'user', attributes: ['first_name', 'last_name'] }]
        }
      ]
    });
  }

  static async getDepartmentById(departmentId: string): Promise<DepartmentModel | null> {
    return await DepartmentModel.findByPk(departmentId, {
      include: [
        { 
          association: 'head_of_department',
          include: [{ association: 'user', attributes: ['first_name', 'last_name', 'email'] }]
        }
      ]
    });
  }

  static async getDepartmentByCode(code: string, tenantId: string): Promise<DepartmentModel | null> {
    return await DepartmentModel.findOne({
      where: { code, tenant_id: tenantId }
    });
  }

  static async updateDepartment(
    departmentId: string, 
    updates: Partial<CreateDepartmentDTO>
  ): Promise<DepartmentModel> {
    const department = await DepartmentModel.findByPk(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    await department.update(updates);
    return department;
  }

  static async deactivateDepartment(departmentId: string): Promise<void> {
    const department = await DepartmentModel.findByPk(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    await department.update({ is_active: false });
  }

  // ============ BED MANAGEMENT ============

  static async allocateBed(departmentId: string): Promise<DepartmentModel> {
    const department = await DepartmentModel.findByPk(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    await department.allocateBed();
    return department;
  }

  static async releaseBed(departmentId: string): Promise<DepartmentModel> {
    const department = await DepartmentModel.findByPk(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    await department.releaseBed();
    return department;
  }

  static async getDepartmentOccupancy(departmentId: string): Promise<{
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    occupancy_rate: number;
    is_full: boolean;
  }> {
    const department = await DepartmentModel.findByPk(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    return {
      total_beds: department.bed_capacity || 0,
      occupied_beds: department.beds_occupied || 0,
      available_beds: department.beds_available,
      occupancy_rate: department.occupancy_rate,
      is_full: department.is_full
    };
  }

  // ============ STAFF MANAGEMENT ============

  static async assignStaff(data: AssignStaffDTO): Promise<DepartmentStaff> {
    // Check if assignment already exists
    const existing = await DepartmentStaff.findOne({
      where: {
        department_id: data.department_id,
        user_id: data.user_id,
        is_active: true
      }
    });

    if (existing) {
      throw new Error('User is already assigned to this department');
    }

    return await DepartmentStaff.create(data as unknown as CreationAttributes<DepartmentStaff>);
  }

  static async getDepartmentStaff(departmentId: string): Promise<DepartmentStaff[]> {
    return await DepartmentStaff.findAll({
      where: {
        department_id: departmentId,
        is_active: true
      },
      include: [
        { 
          association: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          association: 'department',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['role', 'ASC'], ['start_date', 'ASC']]
    });
  }

  static async getUserDepartments(userId: string): Promise<DepartmentStaff[]> {
    return await DepartmentStaff.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      include: [
        {
          association: 'department',
          attributes: ['id', 'name', 'code', 'location', 'floor']
        }
      ],
      order: [['is_primary_department', 'DESC'], ['start_date', 'ASC']]
    });
  }

  static async updateStaffAssignment(
    assignmentId: string,
    updates: Partial<AssignStaffDTO>
  ): Promise<DepartmentStaff> {
    const assignment = await DepartmentStaff.findByPk(assignmentId);
    if (!assignment) {
      throw new Error('Staff assignment not found');
    }

    await assignment.update(updates);
    return assignment;
  }

  static async removeStaff(assignmentId: string, endDate?: Date): Promise<void> {
    const assignment = await DepartmentStaff.findByPk(assignmentId);
    if (!assignment) {
      throw new Error('Staff assignment not found');
    }

    await assignment.deactivate(endDate);
  }

  // ============ ANALYTICS ============

  static async getDepartmentAnalytics(departmentId: string): Promise<any> {
    const department = await this.getDepartmentById(departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    const staff = await this.getDepartmentStaff(departmentId);
    
    const staffByRole = staff.reduce((acc: any, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    }, {});

    const occupancy = department.bed_capacity ? {
      total_beds: department.bed_capacity,
      occupied_beds: department.beds_occupied || 0,
      available_beds: department.beds_available,
      occupancy_rate: department.occupancy_rate,
      is_full: department.is_full
    } : null;

    return {
      department: {
        id: department.id,
        code: department.code,
        name: department.name,
        location: department.location,
        floor: department.floor,
        is_active: department.is_active,
        operating_hours: {
          start: department.operating_hours_start,
          end: department.operating_hours_end,
          is_operating_now: department.isOperating()
        }
      },
      head_of_department: department.head_of_department ? {
        id: department.head_of_department.id,
        name: (department.head_of_department as any).user?.first_name + ' ' + (department.head_of_department as any).user?.last_name,
        specialization: department.head_of_department.specialization
      } : null,
      staff_count: {
        total: staff.length,
        by_role: staffByRole
      },
      bed_occupancy: occupancy
    };
  }

  static async getTenantDepartmentSummary(tenantId: string): Promise<any> {
    const departments = await this.getAllDepartments(tenantId, true);
    
    const totalBeds = departments.reduce((sum, d) => sum + (d.bed_capacity || 0), 0);
    const occupiedBeds = departments.reduce((sum, d) => sum + (d.beds_occupied || 0), 0);
    
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const staff = await this.getDepartmentStaff(dept.id);
        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          staff_count: staff.length,
          bed_capacity: dept.bed_capacity || 0,
          beds_occupied: dept.beds_occupied || 0,
          occupancy_rate: dept.occupancy_rate
        };
      })
    );

    return {
      total_departments: departments.length,
      active_departments: departments.filter(d => d.is_active).length,
      total_bed_capacity: totalBeds,
      total_beds_occupied: occupiedBeds,
      overall_occupancy_rate: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
      departments: departmentStats
    };
  }

  // ============ UTILITY METHODS ============

  static async getOperatingDepartments(tenantId: string, time?: string): Promise<DepartmentModel[]> {
    const departments = await this.getAllDepartments(tenantId, true);
    return departments.filter(d => d.isOperating(time));
  }

  static async getAvailableDepartments(tenantId: string): Promise<DepartmentModel[]> {
    const departments = await this.getAllDepartments(tenantId, true);
    return departments.filter(d => !d.is_full);
  }
}
