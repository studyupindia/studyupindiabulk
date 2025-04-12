const constants = require("../../config/constants/schema");

module.exports = (sequelize, DataTypes) => {
  const Quote = sequelize.define(
    "Quote",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      orderRequestId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      books: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          isValidBooks(value) {
            if (!Array.isArray(value)) {
              throw new Error("Books must be an array of book details.");
            }
          },
        },
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      discountPercentage: {
        type: DataTypes.DECIMAL(5, 2), // Allows up to 100.00%
        allowNull: false,
        defaultValue: 0,
        validate: {
          isDecimal: true,
          min: 0,
          max: 100,
        },
      },
      discountAmount: {
        type: DataTypes.VIRTUAL,
        get() {
          const totalPrice = parseFloat(this.getDataValue("totalPrice") || 0);
          const discountPercentage = parseFloat(
            this.getDataValue("discountPercentage") || 0
          );
          return (totalPrice * discountPercentage) / 100;
        },
      },
      deliveryCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      handlingCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          isDecimal: true,
          min: 0,
        },
      },
      grandTotal: {
        type: DataTypes.VIRTUAL,
        get() {
          const totalPrice = parseFloat(this.getDataValue("totalPrice") || 0);
          const discountAmount = this.get("discountAmount"); // Use the virtual getter
          const deliveryCharges = parseFloat(
            this.getDataValue("deliveryCharges") || 0
          );
          const handlingCharges = parseFloat(
            this.getDataValue("handlingCharges") || 0
          );

          return (
            totalPrice - discountAmount + deliveryCharges + handlingCharges
          );
        },
      },
      paymentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true,
        },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "draft",
        validate: {
          isIn: [constants.QUOTE_STATUSES],
        },
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // New fields for revision management
      revisionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      revisionHistory: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        // Format: [{ books, totalPrice, deliveryCharges, timestamp, reason, userId }]
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "quotes",
      timestamps: true,
      indexes: [{ fields: ["orderRequestId"] }, { fields: ["sellerId"] }],
      hooks: {
        beforeSave: (instance, options) => {
          // Track revisions when quote is modified
          if (
            !instance.isNewRecord &&
            (instance.changed("books") ||
              instance.changed("totalPrice") ||
              instance.changed("discountPercentage") || // Track changes to discountPercentage
              instance.changed("deliveryCharges") ||
              instance.changed("handlingCharges"))
          ) {
            const revisionEntry = {
              books: instance.previous("books"),
              totalPrice: instance.previous("totalPrice"),
              discountPercentage: instance.previous("discountPercentage") || 0, // Add discountPercentage
              // Calculate the previous discount amount for display purposes
              discountAmount: (
                (parseFloat(instance.previous("totalPrice") || 0) *
                  parseFloat(instance.previous("discountPercentage") || 0)) /
                100
              ).toFixed(2),
              deliveryCharges: instance.previous("deliveryCharges"),
              handlingCharges: instance.previous("handlingCharges") || 0,
              timestamp: new Date(),
              reason: options.revisionReason || null,
              userId: options.userId || null,
            };

            let currentHistory = instance.revisionHistory || [];
            if (typeof currentHistory === "string") {
              currentHistory = JSON.parse(currentHistory);
            }

            instance.revisionHistory = [...currentHistory, revisionEntry];
          }
        },
      },
    }
  );

  Quote.associate = (models) => {
    Quote.belongsTo(models.OrderRequest, { foreignKey: "orderRequestId" });
    Quote.belongsTo(models.User, { foreignKey: "sellerId" });
    Quote.hasMany(models.Payment, { foreignKey: "quoteId" });
  };

  // Revision helper method
  Quote.prototype.revise = async function (newData, reason, userId) {
    const options = {
      revisionReason: reason,
      userId: userId,
    };

    await this.update(
      {
        books: newData.books || this.books,
        totalPrice: newData.totalPrice || this.totalPrice,
        deliveryCharges: newData.deliveryCharges || this.deliveryCharges,
        message: newData.message || this.message,
        status: newData.status || this.status,
        expiryDate: newData.expiryDate || this.expiryDate,
      },
      options
    );

    return this;
  };

  return Quote;
};
