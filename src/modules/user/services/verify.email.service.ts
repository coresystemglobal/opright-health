// // services/EmailVerificationService.ts
// import { Model } from 'sequelize-typescript';
// import { Redis } from 'ioredis';
// import { Op } from 'sequelize';

// interface VerificationResult {
//   statusCode: number;
//   status: 'success' | 'fail';
//   message: string;
//   data: any;
// }

// interface EmailVerificationOptions {
//   redisClient: Redis;
//   model: typeof Model;
//   verificationCodePrefix?: string;
//   expirationTime?: number;
// }

// class EmailVerificationService {
//   private redisClient: Redis;
//   private model: typeof Model;
//   private verificationCodePrefix: string;
//   private expirationTime: number;

//   constructor({
//     redisClient, 
//     model, 
//     verificationCodePrefix = 'verify:', 
//     expirationTime = 3600 // 1 hour default
//   }: EmailVerificationOptions) {
//     this.redisClient = redisClient;
//     this.model = model;
//     this.verificationCodePrefix = verificationCodePrefix;
//     this.expirationTime = expirationTime;
//   }

//   // Generate Verification Code
//   async generateVerificationCode(email: string): Promise<string> {
//     const code = Math.floor(100000 + Math.random() * 900000).toString();
    
//     await this.redisClient.set(
//       `${this.verificationCodePrefix}${email}`, 
//       code, 
//       'EX', 
//       this.expirationTime
//     );
    
//     return code;
//   }

//   // Verify Email
//   async verifyEmail({
//     email, 
//     code
//   }: {
//     email: string, 
//     code: string
//   }): Promise<VerificationResult> {
//     try {
//       // Get verification code from Redis
//       const verificationCode = await this.redisClient.get(
//         `${this.verificationCodePrefix}${email}`
//       );

//       // Check if code matches
//       if (verificationCode === code) {
//         // Update model to mark as verified
//         await this.model.update(
//           { verified: true },
//           { where: { email } }
//         );

//         // Delete verification code after successful verification
//         await this.redisClient.del(`${this.verificationCodePrefix}${email}`);

//         return {
//           statusCode: 200,
//           status: 'success',
//           message: 'User verified successfully',
//           data: null
//         };
//       }

//       // Check if user is already verified
//       const verifiedUser = await this.model.findOne({
//         where: {
//           [Op.and]: [
//             { email },
//             { verified: true }
//           ]
//         }
//       });

//       if (verifiedUser) {
//         return {
//           statusCode: 200,
//           status: 'success',
//           message: 'User already verified',
//           data: null
//         };
//       }

//       // Invalid verification code
//       return {
//         statusCode: 400,
//         status: 'fail',
//         message: 'Invalid or expired verification code',
//         data: null
//       };
//     } catch (error) {
//       console.error('Email verification error:', error);
//       return {
//         statusCode: 500,
//         status: 'fail',
//         message: 'Internal server error during verification',
//         data: null
//       };
//     }
//   }
// }

// export default EmailVerificationService;
