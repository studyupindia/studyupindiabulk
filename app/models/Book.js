const constants = require("../../config/constants/schema");

module.exports = (sequelize, DataTypes) => {
  const Book = sequelize.define(
    "Book",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: [1, 255],
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 255],
        },
      },
      publication: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [constants.BOOK_TYPES],
        },
      },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [constants.BOOK_LANGUAGES],
        },
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      class: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "other",
        validate: {
          isIn: [constants.BOOK_CLASSES],
        },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0.01,
        },
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "books",
      timestamps: true,
      indexes: [
        {
          fields: ["title", "sellerId", "publication"],
        },
      ],
    }
  );

  Book.associate = (models) => {
    Book.belongsTo(models.User, { foreignKey: "sellerId", as: "Seller"});
  };

  return Book;
};
