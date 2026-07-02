import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/common.types';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be defined in environment variables');
  }
  return secret;
}

const authentication = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	let token;
	token = req.headers.authorization?.split(' ')[1] as string;
	if (!token) {
			return res.status(401).json({ message: 'No token provided' });
		}
	try {
		const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
		req.user = {
			userId: decoded.userId,
			email: decoded.email,
			role: decoded.role
		};
		return next();

	} catch (error) {
		console.error('AUTHENTICATION ERROR:', error);
		return res.status(401).send({ error: 'Please authenticate.' });
	}
};
export default authentication;
