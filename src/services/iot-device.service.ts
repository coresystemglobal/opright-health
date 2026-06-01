import { EventEmitter } from 'events';
import { NotificationService, NotificationType } from './notification.service';

interface DeviceReading {
  deviceId: string;
  patientId?: string;
  timestamp: Date;
  readings: {
    heartRate?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    temperature?: number;
    oxygenSaturation?: number;
    glucoseLevel?: number;
  };
  alerts?: string[];
}

interface DeviceConfig {
  deviceId: string;
  type: 'vital_monitor' | 'glucose_meter' | 'blood_pressure' | 'thermometer' | 'pulse_oximeter';
  location: string;
  tenantId: string;
  thresholds: {
    heartRate?: { min: number; max: number };
    bloodPressure?: { systolic: { min: number; max: number }; diastolic: { min: number; max: number } };
    temperature?: { min: number; max: number };
    oxygenSaturation?: { min: number };
    glucoseLevel?: { min: number; max: number };
  };
}

export class IoTDeviceService extends EventEmitter {
  private static instance: IoTDeviceService;
  private devices: Map<string, DeviceConfig> = new Map();
  private readings: Map<string, DeviceReading[]> = new Map();

  static getInstance(): IoTDeviceService {
    if (!this.instance) {
      this.instance = new IoTDeviceService();
    }
    return this.instance;
  }

  registerDevice(config: DeviceConfig): void {
    this.devices.set(config.deviceId, config);
    this.readings.set(config.deviceId, []);
    
    console.log(`IoT Device registered: ${config.deviceId} (${config.type})`);
  }

  async processDeviceReading(reading: DeviceReading): Promise<void> {
    const device = this.devices.get(reading.deviceId);
    if (!device) {
      throw new Error(`Device ${reading.deviceId} not registered`);
    }

    // Store reading
    const deviceReadings = this.readings.get(reading.deviceId) || [];
    deviceReadings.push(reading);
    
    // Keep only last 1000 readings
    if (deviceReadings.length > 1000) {
      deviceReadings.splice(0, deviceReadings.length - 1000);
    }
    
    this.readings.set(reading.deviceId, deviceReadings);

    // Check for alerts
    const alerts = this.checkThresholds(reading, device);
    if (alerts.length > 0) {
      await this.handleAlerts(reading, alerts, device);
    }

    // Emit event for real-time updates
    this.emit('reading', { deviceId: reading.deviceId, reading, alerts });
  }

  private checkThresholds(reading: DeviceReading, device: DeviceConfig): string[] {
    const alerts: string[] = [];
    const { readings } = reading;
    const { thresholds } = device;

    if (readings.heartRate && thresholds.heartRate) {
      if (readings.heartRate < thresholds.heartRate.min) {
        alerts.push(`Low heart rate: ${readings.heartRate} bpm`);
      } else if (readings.heartRate > thresholds.heartRate.max) {
        alerts.push(`High heart rate: ${readings.heartRate} bpm`);
      }
    }

    if (readings.bloodPressure && thresholds.bloodPressure) {
      if (readings.bloodPressure.systolic > thresholds.bloodPressure.systolic.max) {
        alerts.push(`High blood pressure: ${readings.bloodPressure.systolic}/${readings.bloodPressure.diastolic}`);
      }
    }

    if (readings.temperature && thresholds.temperature) {
      if (readings.temperature > thresholds.temperature.max) {
        alerts.push(`High temperature: ${readings.temperature}°F`);
      } else if (readings.temperature < thresholds.temperature.min) {
        alerts.push(`Low temperature: ${readings.temperature}°F`);
      }
    }

    if (readings.oxygenSaturation && thresholds.oxygenSaturation) {
      if (readings.oxygenSaturation < thresholds.oxygenSaturation.min) {
        alerts.push(`Low oxygen saturation: ${readings.oxygenSaturation}%`);
      }
    }

    return alerts;
  }

  private async handleAlerts(reading: DeviceReading, alerts: string[], device: DeviceConfig): Promise<void> {
    // Send notifications for critical alerts
    for (const alert of alerts) {
      await NotificationService.sendNotification({
        type: NotificationType.EMERGENCY,
        title: 'Critical Vital Signs Alert',
        message: `${alert} - Device: ${device.deviceId} - Location: ${device.location}`,
        tenantId: device.tenantId,
        userId: reading.patientId,
        data: {
          deviceId: reading.deviceId,
          reading: reading.readings,
          alert
        }
      });
    }
  }

  getDeviceReadings(deviceId: string, limit: number = 100): DeviceReading[] {
    const readings = this.readings.get(deviceId) || [];
    return readings.slice(-limit);
  }

  getPatientVitals(patientId: string): DeviceReading[] {
    const allReadings: DeviceReading[] = [];
    
    for (const readings of this.readings.values()) {
      const patientReadings = readings.filter(r => r.patientId === patientId);
      allReadings.push(...patientReadings);
    }

    return allReadings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);
  }

  // Simulate device data for testing
  simulateDeviceData(deviceId: string, patientId?: string): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const generateReading = (): DeviceReading => {
      const reading: DeviceReading = {
        deviceId,
        patientId,
        timestamp: new Date(),
        readings: {}
      };

      switch (device.type) {
        case 'vital_monitor':
          reading.readings = {
            heartRate: 60 + Math.random() * 40,
            bloodPressure: {
              systolic: 110 + Math.random() * 30,
              diastolic: 70 + Math.random() * 20
            },
            temperature: 98 + Math.random() * 4,
            oxygenSaturation: 95 + Math.random() * 5
          };
          break;
        case 'glucose_meter':
          reading.readings = {
            glucoseLevel: 80 + Math.random() * 100
          };
          break;
        case 'blood_pressure':
          reading.readings = {
            bloodPressure: {
              systolic: 110 + Math.random() * 30,
              diastolic: 70 + Math.random() * 20
            }
          };
          break;
      }

      return reading;
    };

    // Send reading every 30 seconds
    setInterval(() => {
      this.processDeviceReading(generateReading());
    }, 30000);
  }

  getConnectedDevices(tenantId: string): DeviceConfig[] {
    return Array.from(this.devices.values()).filter(device => device.tenantId === tenantId);
  }
}