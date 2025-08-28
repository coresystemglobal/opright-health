// import * as amqp from 'amqplib';

// const QUEUE_NAME = 'appointment_notifications';
// const URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

// class RabbitMQConnection {
//   private static instance: RabbitMQConnection;
//   private connection: amqp.Connection | null = null;
//   private channel: amqp.Channel | null = null;

//   private constructor() {}

//   public static getInstance(): RabbitMQConnection {
//     if (!RabbitMQConnection.instance) {
//       RabbitMQConnection.instance = new RabbitMQConnection();
//     }
//     return RabbitMQConnection.instance;
//   }

//   async connect(url: string = URL) {
//     if (!this.connection) {
//       this.connection = await amqp.connect(url);
//       this.channel = await this.connection.createChannel();
//     }
//     return this.channel;
//   }

//   async createQueue(queueName: string) {
//     if (!this.channel) {
//       throw new Error('RabbitMQ channel not initialized');
//     }
//     await this.channel.assertQueue(queueName, { durable: true });
//   }

//   async sendToQueue(queueName: string, message: any) {
//     if (!this.channel) {
//       throw new Error('RabbitMQ channel not initialized');
//     }
//     this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
//       persistent: true
//     });
//     console.log(`Message sent to ${queueName}`);
//   }

//   async consume(queueName: string, callback: (msg: amqp.ConsumeMessage | null) => void) {
//     if (!this.channel) {
//       throw new Error('RabbitMQ channel not initialized');
//     }
//     await this.channel.consume(queueName, callback, { noAck: false });
//     console.log(`Consuming messages from ${queueName}`);
//   }
// }

// export default RabbitMQConnection;
