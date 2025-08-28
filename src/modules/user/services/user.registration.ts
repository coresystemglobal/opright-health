import { customAlphabet } from "nanoid";
import bcrypt from "bcrypt";
import {Op} from 'sequelize'

import { getFromRedis, saveToRedis } from "../../../core/redis";
import { CreationAttributes } from "sequelize";
import { User } from "../user.model";
import sendEmail from "../../services/email.service";


const salt = process.env.BCRYPT_SALT || 10;

export const registerUser = async (userData: CreationAttributes<User>) => {
  try {
    const emailExists = await User.findOne({
      where: {
        email: userData.email,
      },
    });
    if (emailExists) {
      return {
        statusCode: 400,
        status: 'fail',
        message: `User already exists, login with this email and password`,
        data: null
      };
    }
    const hashed = await bcrypt.hash(userData.password, salt);
    const username = userData.email.split('@')[0];
    let userCreationData = {
      username: username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      password: hashed,
    };

    const { password: _, ...userRegistrationData } = userCreationData;
    const user = await User.create(userCreationData);
    if (user) {
      const nanoid = customAlphabet("1234567890", 6)();
      const verificationCode = nanoid;
      await saveToRedis(`"verify" + ${user.email}`, verificationCode, 600);
      const emailPayload = {
        to: user.email as string,
        subject: "Email Verification",
        text: `Your verification code is ${verificationCode}`,
      };
      await sendEmail(emailPayload);
    }

    return {
      statusCode: 201,
      status: "success",
      message: "User registered",
      data: [userRegistrationData],
    };
  } catch (error) {
    console.log('ERROR', error);
    throw error;
  }
};

export const verifyUser = async ({email, code}: {email: string, code: string}) => {
  try {
    const verificationCode = await getFromRedis(`"verify" + ${email}`);
    if (verificationCode === code) {
      await User.update(
        { verified: true },
        { where: { email } },
      );
      return {
        statusCode: 200,
        status: "success",
        message: "User verified",
        data: null
      };
    }
    const verifiedUser = await User.findOne(
      { where: {
        [Op.and]:[
          { email: email },
          { verified: true }
        ],
      } }
    );
    if (verifiedUser) {
      return {
        statusCode: 200,
        status: "success",
        message: "User already verified",
        data: null
      };
    }
    return {
      statusCode: 400,
      status: "fail",
      message: "Invalid verification code",
      data: null
    };
  } catch (error) {
    throw error;
  }
};

export const resendCode = async (emailPayload: string ) => {
  try {
    const email = emailPayload;
    const nanoid = customAlphabet("1234567890", 6)();
    const verificationCode = nanoid;
    await saveToRedis(`verify:${email}`, verificationCode, 600);
    const name = email.split('@')[0];
    const emailData = {
      to: email,
      subject: "Email Verification",
      text: `Hi ${name}, Your verification code is ${verificationCode}`,
    };
    await sendEmail(emailData);
    return {
      statusCode: 200,
      status: "success",
      message: "Verification code sent to your email",
      data: [],
    };

  } catch (error) {
    console.log('Error ocurred', error)
    throw error;
  }
};
