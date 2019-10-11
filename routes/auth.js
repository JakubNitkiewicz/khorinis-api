const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const AuthUser = require('../models/AuthUser')
const {
  signupValidation,
  loginValidation
} = require('../controllers/auth/validation')

// Get all users
router.get('/', (req, res) => {
  User.findAll()
    .then((gigs) => {
      res.send(gigs)
    })
    .catch((err) => {
      res.status(400).send(err)
    })
})

// Register user route
router.post('/signup', async (req, res) => {
  // Hash password
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(req.body.password, salt)

  const user = {
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword
  }

  // Validate input
  const error = signupValidation(user).error
  if (error) return res.status(400).send(error.details)
  console.log('a')
  // Check if email/username already exists
  const emailExists = await AuthUser.findOne({
    where: {
      email: user.email
    }
  })
  console.log('b')
  if (emailExists) return res.status(400).send('Email is already taken')
  const usernameExists = await User.findOne({
    where: {
      username: user.username
    }
  })
  if (usernameExists) return res.status(400).send('Username is already taken')
  console.log('c')

  // Create new user
  AuthUser.create({
    // ...user
    email: user.email,
    password: user.password
  })
    .then((createdUser) => {
      const token = generateToken(
        createdUser.id,
        process.env.TOKEN_SECRET,
        process.env.TOKEN_LIFE
      )
      const refreshToken = generateToken(
        createdUser.id,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_LIFE
      )
      User.create({
        // ...user
        username: user.username
      })
      .catch((err) => {
        res.status(400).send(err)
      })
      res.header('auth-token', token).header('refresh-token', refreshToken).send(user)
    })
    .catch((err) => {
      res.status(400).send(err)
    })
})

// Login route
router.post('/signin', async (req, res) => {
  // Validate input
  const error = loginValidation({
    email: req.body.email,
    password: req.body.password
  }).error
  if (error) return res.status(400).send(error.details)

  // Check if user with provided email exists
  const user = await User.findOne({
    raw: true,
    where: {
      email: req.body.email
    }
  })
  if (!user) return res.status(400).send('Email or password is incorrect')

  // Check if password is correct
  const validPassword = await bcrypt.compare(req.body.password, user.password)
  if (!validPassword)
    return res.status(400).send('Email or password is incorrect')

  const token = generateToken(
    user.id,
    process.env.TOKEN_SECRET,
    process.env.TOKEN_LIFE
  )
  const refreshToken = generateToken(
    user.id,
    process.env.REFRESH_TOKEN_SECRET,
    process.env.REFRESH_TOKEN_LIFE
  )
  console.log(token)
  res
    .header('auth-token', token)
    .header('refresh-token', refreshToken)
    .send(token + '       ' + refreshToken)
})

router.post('/refresh', async (req, res) => {
  return
})

const generateToken = (id, secret, life) => {
  return jwt.sign({ id }, secret, { expiresIn: life })
}

module.exports = router
