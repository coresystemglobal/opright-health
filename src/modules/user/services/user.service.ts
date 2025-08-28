import { getFromRedis, saveToRedis } from "../../../core/redis";
import { CreationAttributes } from "sequelize";
import { User } from "../user.model";
import { UserResponseData } from "../../types/type";
import { Patient } from "../../patient/patient.model";

export const getAllUsers = async (): Promise<UserResponseData> => {
  try {
    let key = "fetch:allUsers";
    let fetchUsers: string | null = await getFromRedis(key);
    if (fetchUsers) {
      return {
        statusCode: 200,
        status: "success",
        message: "Users fetched from cache",
        data: JSON.parse(fetchUsers),
      };
    }
    const users = await User.findAll({
      attributes: {
        exclude: ["password", "createdAt", "updatedAt"],
      },
    });

    if (users && users.length > 0) {
      await saveToRedis(key, JSON.stringify(users), 900);
      return {
        statusCode: 200,
        status: "success",
        message: "Users fetched from database",
        data: users,
      };
    }

    return {
      statusCode: 404,
      status: "fail",
      message: "No user found",
      data: [],
    };
  } catch (error) {
    throw error;
  }
};

export const getOneUser = async (id: string): Promise<UserResponseData> => {
  try {
    const user = await User.findByPk(id, {
      attributes: {
        exclude: ["password", "created_at", "updated_at"],
      },
        include: [
          {
            model: Patient,
            as: "patient",
            attributes: {
              exclude: ["created_at", "updated_at", "deleted_at"]
            }
          }
        ]
    });
    if (user) {
      const patient = await User.findOne( {
        where: {
          email: user.email
        },
        attributes:{
          include: ['id']
        },
        include: [
          {
            model: Patient,
            as: "patient",
            attributes: {
              exclude: ["created_at", "updated_at", "deleted_at"]
            }
          }
        ]
      });
      console.log("PATIENT INFO FROM USER", patient?.dataValues.patient.id);
    }
    
    if (!user) {
      return {
        statusCode: 404,
        status: "fail",
        message: "User not found",
        data: [],
      };
    }
    return {
      statusCode: 200,
      status: "success",
      message: "User found",
      data: user,
    };
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: string,
  userData: CreationAttributes<User>
) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return {
        statusCode: 404,
        status: "fail",
        message: "User not found",
        data: [],
      };
    }
    const updatedUser = await user.update(userData);
    return {
      statusCode: 200,
      status: "success",
      message: "User updated",
      data: updatedUser,
    };
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const deletedRow = await User.destroy({ where: { id }});
    if (!deletedRow || deletedRow === 0) {
      return {
        statusCode: 404,
        status: "fail",
        message: "User not found",
        data: [],
      };
    }

    return {
      statusCode: 200,
      status: "success",
      message: "User deleted",
      data: deletedRow,
    };
  } catch (error) {
    throw error;
  }
}
