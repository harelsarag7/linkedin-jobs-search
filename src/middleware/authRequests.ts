import dotenv from 'dotenv'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { RequestHandler } from 'express'
import { findUserByEmail } from '../services/user'
import { RequestWithUser } from '../types/request'

dotenv.config({ path: '.env' })
const JWT_SECRET = process.env.JWT_SECRET!
if (!JWT_SECRET) throw new Error('JWT secret is not set')

export const authenticateAndCheckUser: RequestHandler = async (
  req,
  res,
  next
) => {
//   let token = (req as RequestWithUser).cookies?.applierToken
  let token = null;
  if (!token) {
    token = req.headers.authorization;
    if(!token) {
        res.status(401).json({ isAuthenticated: false, message: 'No token provided' })
        return
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    if (!decoded.email) {
      res
        .status(401)
        .json({ isAuthenticated: false, message: "User's email not found in token" })
      return
    }

    const user = await findUserByEmail(decoded.email)
    if (!user) {
      res.status(401).json({ isAuthenticated: false, message: 'User not found' })
      return
    }

    ;(req as RequestWithUser).user = user
    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ isAuthenticated: false, message: 'Token expired' })
      return
    }
    res
      .status(401)
      .json({ isAuthenticated: false, message: 'JWT verification failed' })
  }
}
