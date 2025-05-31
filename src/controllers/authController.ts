import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createUser, findUserByEmail } from '../services/user'  // your user persistence

const JWT_SECRET = process.env.JWT_SECRET!
const PASS_SALT = process.env.PASS_SALT


if (!JWT_SECRET) throw new Error('JWT_SECRET is not set')
if (!PASS_SALT) throw new Error('PASS_SALT is not set')

  const isProd = process.env.NODE_ENV !== 'development'

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res
          .status(400)
          .json({ success: false, message: 'Email and password required' })
      }
      const customPassword = password + PASS_SALT
      // one-liner: bcrypt will genSalt internally
      const hashed = await bcrypt.hash(customPassword, 10)

      await createUser({ email: email.toLowerCase(), password: hashed })

      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '14d' })
      res.cookie('applierToken', token, {
        httpOnly: isProd ? true : false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000,
        path: '/',
      })

      res.json({ success: true, message: 'User registered', email })
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' })
      }

      // lookup user
      const user = await findUserByEmail(email)
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      // verify password
      if(!user.password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }
      const customPassword = password + PASS_SALT

      const match = await bcrypt.compare(customPassword, user.password)
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      // sign token
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '14d' })

      // set cookie
      res.cookie('applierToken', token, {
        httpOnly: isProd ? true : false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 14 * 24 * 60 * 60 * 1000,
        path: '/',
      })

      res.json({ success: true, message: 'User logged in successfully', email })
    } catch (error) {
      console.error('Error during login:', error)
      next(error)
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.applierToken
    if (!token) {
      res.json({ valid: false })
      return 
    }
  
    try {
      jwt.verify(token, JWT_SECRET)
      res.json({ valid: true })
    } catch {
      res.json({ valid: false })
    }
  },

  async deleteTokens(req: Request, res: Response, next: NextFunction) {
    res.clearCookie('applierToken', {
      httpOnly: process.env.NODE_ENV === 'development' ? false : true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    })

    res.json({ success: true, message: 'Token deleted successfully' })
  }
}

