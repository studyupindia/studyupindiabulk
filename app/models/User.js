const constants = require("../../config/constants/schema");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [8, 128],
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          // Custom validator for Indian phone numbers
          isValidPhone(value) {
            if (value && !/^[6-9]\d{9}$/.test(value)) {
              throw new Error("Must be a valid Indian phone number");
            }
          },
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
        validate: {
          isIn: [constants.USER_STATUSES],
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "buyer",
        validate: {
          isIn: [constants.USER_ROLES],
        },
      },
      publication: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "external",
        validate: {
          isIn: [constants.USER_SOURCES],
        },
      },
      // Address information
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pincode: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isValidPincode(value) {
            if (value && !/^\d{6}$/.test(value)) {
              throw new Error("Must be a valid 6-digit Indian pincode");
            }
          },
        },
      },
      // For sellers - additional fields
      businessName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstin: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isValidGSTIN(value) {
            if (
              value &&
              !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(
                value
              )
            ) {
              throw new Error("Must be a valid GSTIN");
            }
          },
        },
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      resetPasswordExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["email"],
        },
        {
          fields: ["role", "status"],
        },
      ],
    }
  );

  User.associate = (models) => {
    User.hasMany(models.OrderRequest, { foreignKey: "buyerId" });
    User.hasMany(models.Book, { foreignKey: "sellerId" });
    User.hasMany(models.Quote, { foreignKey: "sellerId" });
  };

  return User;
};
