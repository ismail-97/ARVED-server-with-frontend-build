const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const nodemailer = require('nodemailer')
const Faculty = require('../models/faculty')
const Department = require('../models/department')

// const transporter = nodemailer.createTransport({
//     host: 'smtp.ethereal.email',
//     port: 587,
//     auth: {
//         user: "diana.hoppe45@ethereal.email",
//         pass: '4Ug2quEHaBm4pKNjzJ'
//     }
// })

const User = require('../models/user')
const faculty = require('../models/faculty')

// sign up
loginRouter.post('/register', async (request, response) => {
  const body = request.body
  const { password } = body
  // console.log(body)
  const saltRounds = 10
  const passwordHash = await bcrypt.hash(password, saltRounds)
  const user = new User({
    ...body,
    passwordHash: passwordHash,
    role: 'user',
    status: 'pending',
    isVerified: true,
  })

  const savedUser = await user.save()
  // email verification
  // jwt.sign(
  //     { user: savedUser._id },
  //     process.env.EMAIL_SECRET,
  //     { expiresIn: '1d' },
  //     (error, emailToken) => {
  //         if (error) {
  //             response.status(400)
  //         }
  //         const url = `http://localhost:3001/confirmation/${emailToken}`;
  //         transporter.sendMail({
  //             to: "arvedsystem@outlook.com",
  //             subject: "Confrim Your ARVED account",
  //             html: `<html>
  //             <body> To confim your email click here: <a href= "${url}"> ${url}</a>  </body>
  //             </html>`
  //         })
  //     }
  // )
  response.status(201).json(savedUser)
})

// confirming email
loginRouter.get('/confirmation/:token', async (request, response) => {
  jwt.verify(
    request.params.token,
    process.env.EMAIL_SECRET,
    async (err, decoded) => {
      if (err) {
        return response
          .status(401)
          .json({ error: 'eroor: email verification failed' })
      }
      await User.findByIdAndUpdate(
        decoded.user,
        { isVerified: true },
        { new: true }
      )
      response.status(200).redirect('http://localhost:3000/verification')
    }
  )
})

// for login
loginRouter.post('/login', async (request, response) => {
  const { email, password } = request.body
  const user = await User.findOne({ email: email })
  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({
      error: 'invalid username or password',
    })
  }

  const userForToken = {
    name: user.name,
    id: user._id,
  }
  const token = jwt.sign(userForToken, process.env.SECRET)
  response.status(200).send({
    token,
    name: user.name,
    surname: user.surname,
    status: user.status,
    isVerified: user.isVerified,
    role: user.role,
    department: user.department,
  })
  // response
})

// for forgot password (takes a user email & creates a link for changing password and sends it that email)
loginRouter.post('/forgot-password', async (request, response) => {
  const { email } = request.body
  User.findOne({ email: email }, (err, user) => {
    if (err || !user) {
      return response.status(400).send('user with this email does not exist')
    }
    const userToken = jwt.sign(
      { user: user._id },
      process.env.FORGOT_PASSWORD_SECRET,
      { expiresIn: '15m' }
    )

    const url = `http://localhost:3001/reset-password/${userToken}`
    transporter.sendMail({
      to: 'ismailkamaleldin@gmail.com',
      subject: 'change Your ARVED password',
      html: `To change your password click here: <a href= "${url}"> ${url}</a>`,
    })
    response.status(200).send({ userToken })
  })
})

// for reset password (creates a link and sends it to user email)
loginRouter.put('/reset-password/:token', async (request, response) => {
  const { password } = request.body
  jwt.verify(
    request.params.token,
    process.env.FORGOT_PASSWORD_SECRET,
    async (err, decoded) => {
      if (err) {
        return response
          .status(401)
          .json({ error: 'eroor: token verification failed' })
      }

      const saltRounds = 10
      const passwordHash = await bcrypt.hash(password, saltRounds)
      await User.findByIdAndUpdate(
        decoded.user,
        { passwordHash: passwordHash },
        { new: true }
      )
      response.status(200).send('User password updated')
    }
  )
})

loginRouter.get('/faculties', async (request, response) => {
  let faculties = await Faculty.find({})
  response.status(200).json(faculties)
})

// POST is used since can't send payload with get request.
loginRouter.post('/departments', async (request, response) => {
  let departments = await Department.find({ faculty: request.body.faculty })
  response.status(200).json(departments)
})

loginRouter.get('/academic_titles', async () => {})

module.exports = loginRouter
