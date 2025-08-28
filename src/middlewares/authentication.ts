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

const secret: string = process.env.JWT_SECRET as string;

const authentication = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
	if (!secret) {
		throw new Error('JWT_SECRET must be defined in environment variables');
	}
	let token;
	token = req.headers.authorization?.split(' ')[1] as string;
	if (!token) {
			return res.status(401).json({ message: 'No token provided' });
		}
	try {
		const decoded = jwt.verify(token, secret as string) as JwtPayload;
		if (!decoded) {
			res.status(401).json({ message: 'Unauthorized' });
			return;
		}
		
		req.user = {
			userId: decoded.userId,
			email: decoded.email,
			role: decoded.role
		};
		next();

	} catch (error) {
		console.error('AUTHENTICATION ERROR:', error);
		res.status(401).send({ error: 'Please authenticate.' });
	}
};
export default authentication;
