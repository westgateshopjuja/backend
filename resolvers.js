import {
  Admin,
  User,
  Order,
  Product,
  Section,
  Transaction,
} from "./models/index.js";

import { CourierClient } from "@trycourier/courier";
import { Novu } from "@novu/node";
import dotenv from "dotenv";
import algoliasearch from "algoliasearch";
dotenv.config();

const client = algoliasearch("E69WTTSMZF", "26fa38d2eef93164155c64ba76284a3d");
const index = client.initIndex("products");

const novu = new Novu(process.env.NOVU_API_KEY);

const courier = CourierClient({
  authorizationToken: process.env.COURIER_AUTH_TOKEN,
});

function omit(obj, ...props) {
  const result = { ...obj };
  props.forEach(function (prop) {
    delete result[prop];
  });
  return result;
}

const triggerNotification = async ({ name }) => {
  const response = await novu
    .trigger("on-boarding-notification-A72_hAYmG", {
      to: {
        subscriberId: process.env.NOVU_SUBSCRIBER_ID,
      },
      payload: {
        name,
      },
    })
    .catch((err) => console.error(err));
  return response;
};

const resolvers = {
  User: {
    cart: async (parent, args) => {
      let _cart = [];

      let cartItems = parent?.cart;

      for (let item of cartItems) {
        let _populated = {
          product: await Product.findById(item?.product),
          quantity: item?.quantity,
          variant: item?.variant,
          id: item?.id,
        };

        _cart.push(_populated);
      }

      return _cart;
    },
  },

  Order: {
    items: async (parent, args) => {
      let _items = [];

      let orderItems = parent?.items;

      for (let item of orderItems) {
        let _populated = {
          product: await Product.findById(item?.product),
          quantity: item?.quantity,
          variant: item?.variant,
          salePrice: item?.salePrice,
        };

        _items.push(_populated);
      }

      return _items;
    },
  },

  Query: {
    getProducts: async () => {
      const products = await Product.find();
      return products;
    },

    getAdmins: async () => {
      let admins = await Admin.find({ removed: false });
      return admins;
    },

    getProduct: async (_, { id }) => {
      let product = await Product.findById(id);
      return product;
    },

    getUser: async (_, { email }) => {
      let user = await User.findOne({ email }).populate("saved");
      return user;
    },

    getOrders: async (_, { customer }) => {
      const orders = await Order.find({ customer }).populate("payment");
      return orders;
    },

    getAllOrders: async (_, args) => {
      const orders = await Order.find()
        .populate("customer")
        .populate("payment");
      return orders;
    },

    getAdmin: async (_, args) => {
      const { id, email, password } = args;

      let admin;

      if (id) {
        admin = await Admin.findById(id);
        return admin;
      }

      admin = await Admin.findOne({ email, password, removed: false });
      return admin;
    },

    getStatPage: async () => {
      let statPage = {
        totalSales: null,
        totalOrders: null,
        totalProducts: null,
        chartData: [],
        fastestMoving: [],
        slowestMoving: [],
      };

      await Order.find({
        deliveryTimestamp: { $ne: null },
        dispatchTimestamp: { $ne: null },
      }).then(async (docs, err) => {
        statPage["totalOrders"] = docs?.length;

        let orderWorths = [];

        for (let doc of docs) {
          let { items } = doc;
          let orderWorth = 0;
          items.map((item) => {
            orderWorth = orderWorth + item?.salePrice * item?.quantity;
          });
          orderWorths.push(orderWorth);
        }

        statPage["totalSales"] =
          orderWorths.length > 0
            ? orderWorths.reduce((sum, orderWorth) => sum + orderWorth)
            : 0;

        statPage["totalProducts"] = (
          await Product.find({ deleted: false })
        ).length;

        let last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const orders = await Order.find({
          createdAt: { $gte: last30Days },
          deliveryTimestamp: { $ne: null },
          dispatchTimestamp: { $ne: null },
        }).exec();

        let productOrdersCount = {};

        orders.forEach((order) => {
          order.items.forEach((item) => {
            const productId = item?.product?.toString(); // Assuming 'item.product' is a reference to the Product collection
            if (productOrdersCount[productId]) {
              productOrdersCount[productId]++;
            } else {
              productOrdersCount[productId] = 1;
            }
          });
        });

        const sortedProductsFast = Object.entries(productOrdersCount).sort(
          (a, b) => b[1] - a[1]
        );

        const sortedProductsSlow = Object.entries(productOrdersCount).sort(
          (a, b) => a[1] - b[1]
        );

        const fastestMovingProducts = await Promise.all(
          sortedProductsFast.map(async ([productId, orders_per_month]) => {
            const product = await Product.findById(productId).exec();
            return { product: product, ordersPerMonth: orders_per_month };
          })
        );

        const slowestMovingProducts = await Promise.all(
          sortedProductsSlow.map(async ([productId, orders_per_month]) => {
            const product = await Product.findById(productId).exec();
            return { product: product, ordersPerMonth: orders_per_month };
          })
        );

        statPage["fastestMoving"] = fastestMovingProducts;

        statPage["slowestMoving"] = slowestMovingProducts;

        let sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

        // Query the Order collection to get orders made within the last 6 months
        const _orders = await Order.find({
          createdAt: { $gte: sixMonthsAgo },
          deliveryTimestamp: { $ne: null },
          dispatchTimestamp: { $ne: null },
        }).exec();

        let totalSalesByMonth = {};

        _orders.forEach((order) => {
          const createdAt = new Date(order.createdAt); // Convert timestamp to Date object
          const orderMonth = createdAt.toLocaleString("default", {
            month: "short",
          });

          const itemsTotalPrice = order.items.reduce((total, item) => {
            const totalPrice = item?.salePrice * item?.quantity;
            return total + totalPrice;
          }, 0);
          if (totalSalesByMonth[orderMonth]) {
            totalSalesByMonth[orderMonth] += itemsTotalPrice;
          } else {
            totalSalesByMonth[orderMonth] = itemsTotalPrice;
          }
        });

        let labels = [];
        for (let i = 0; i < 6; i++) {
          labels.unshift(
            sixMonthsAgo.toLocaleString("default", { month: "short" })
          );
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() + 1);
        }

        labels.reverse();

        // Combine labels and total sales into an array of objects
        let chartData = labels.map((label) => ({
          label,
          value: totalSalesByMonth[label] || 0,
        }));

        statPage["chartData"] = chartData;
      });

      return statPage;
    },
  },

  Mutation: {
    addProduct: async (_, args) => {
      const {
        name,
        description,
        category,
        variants,
        additionalInformation,
        images,
      } = args;

      try {
        let variantsJS = JSON.parse(variants);
        let additionalInformationJS =
          additionalInformation !== "[]"
            ? JSON.parse(additionalInformation)
            : null;

        let _variants = [];

        for (let _variant of variantsJS) {
          let variant = {
            thumbnail: null,
            label: _variant?.label,
            price: _variant?.price,
            sale: {
              startTime: null,
              endTime: null,
              salePrice: null,
            },
            available: true,
          };
          _variants?.push(variant);
        }

        let newProduct = new Product({
          name,
          description,
          category,
          variants: variantsJS,
          additionalInformation: additionalInformationJS,
          images: [...images],
        });

        console.log({
          name,
          description,
          category,
          variants: variantsJS,
          additionalInformation: additionalInformationJS,
          images: [...images],
        });

        let product = await newProduct.save(); // Await the save operation

        await index.partialUpdateObject({
          ...product,
          objectID: product?.id,
        });

        return product;
      } catch (error) {
        console.error(error);
        throw new Error("An error occurred while adding the product"); // Re-throw the error
      }
    },

    updateProduct: async (_, args) => {
      const {
        variants,
        additionalInformation,
        name,
        description,
        id,
        deleted,
      } = args;

      let update = {};

      if (name) {
        let _variants = [];

        let variantsJS = JSON.parse(variants);
        let additionalInformationJS = JSON.parse(additionalInformation);

        for (let _variant of variantsJS) {
          let variant = {
            thumbnail: null,
            label: _variant?.label,
            price: _variant?.price,
            sale: _variant?.sale,
            available: _variant?.available,
          };
          _variants?.push(variant);
        }

        update = {
          name,
          description,
          variants: _variants,
          additionalInformation: additionalInformationJS,
        };
      } else if (deleted) {
        update = {
          ...omit(args, "id"),
        };
      }

      console.log(update);

      let _product = await Product.findByIdAndUpdate(args?.id, update);

      if (name) {
        index.partialUpdateObject({
          ...update,
          objectID: args?.id,
        });
      } else if (deleted) {
        index.deleteObject(args?.id);
      }

      return _product;
    },

    createAdmin: async (_, args) => {
      let { name, email, levelClearance } = args;

      let newAdmin = new Admin({
        name,
        email,
        levelClearance,
        password: "westgate",
      });

      let admin = newAdmin.save();
      return admin;
    },

    addToCart: async (_, args) => {
      const { customer, product, variant } = args;

      let _customer = await User.findOneAndUpdate(
        {
          email: customer,
        },
        {
          $addToSet: { cart: { product, quantity: 1, variant } },
        }
      );

      return _customer;
    },

    updateCart: async (_, args) => {
      const { id, removal, quantity, email } = args;

      let user;

      if (removal) {
        user = await User.findOneAndUpdate(
          { email },
          { $pull: { cart: { _id: id } } }
        );
      } else {
        user = await User.findOne({ email })
          .then((doc) => {
            const index = doc?.cart.findIndex((object) => {
              return object._id == id;
            });
            let x = doc?.cart[index];
            x.quantity = quantity;
            doc.save();
            return doc;
          })
          .catch((err) => {
            console.log("Oh! Dark");
          });
      }

      return user;
    },

    saveUnsave: async (_, args) => {
      const { product, customer } = args;

      let doc = await User.findOne({ email: customer });

      let items = doc.saved;
      const index = items.indexOf(product);

      let newSaved;

      if (index > -1) {
        items.splice(index, 1);
        newSaved = items;
      } else {
        newSaved = [...items, product];
      }

      let newDoc = await User.findOneAndUpdate(
        { email: customer },
        {
          saved: newSaved,
        }
      );
      return newDoc;
    },

    updateProfile: async (_, args) => {
      const { name, email, phoneNumber } = args;

      let user = await User.findOneAndUpdate({ email }, { name, phoneNumber });
      return user;
    },

    addAddress: async (_, args) => {
      const { label, lat, lng, email } = args;

      let user = await User.findOneAndUpdate(
        { email },
        {
          $addToSet: {
            addresses: {
              label,
              lat,
              lng,
              default: false,
            },
          },
        }
      );

      return user;
    },

    mutateAddress: async (_, args) => {
      const { email, action, id, default: _default } = args;

      let user;

      if (action == "toggle-default") {
        user = await User.findOne({ email })
          .then((doc) => {
            const index = doc?.addresses.findIndex((object) => {
              return object._id == id;
            });
            let x = doc?.addresses[index];
            x.default = _default;
            doc.save();
            return doc;
          })
          .catch((err) => {
            console.log("Oh! Dark");
          });
      }

      if (action == "remove") {
        user = await User.findOneAndUpdate(
          { email, "address.id": id },
          {
            $pull: {
              addresses: {
                _id: id,
              },
            },
          }
        );
      }

      return user;
    },

    checkout: async (_, args) => {
      const { items, customer, payment, _deliveryLocation } = args;

      let user;

      let newTransaction = new Transaction(JSON.parse(payment));
      let transaction = await newTransaction.save();
      console.log(transaction);

      let newOrder = new Order({
        items: JSON.parse(items),
        customer,
        deliveryLocation: JSON.parse(_deliveryLocation),
        payment: transaction?.id,
      });

      newOrder
        .save()
        .then(async (order) => {
          user = await User.findByIdAndUpdate(customer, { cart: [] });
          return order;
        })
        .then(async (order) => {
          let _products = [];
          for (let item of order?.items) {
            let product = await Product.findById(item.product);
            _products.push({
              image: product?.images[0],
              name: product?.name,
              price: item.salePrice,
              variant: item.variant,
              quantity: item.quantity,
            });
          }

          await triggerNotification({ name: user?.name });

          await courier.send({
            message: {
              to: {
                data: {
                  name: user?.name,
                },
                email: user?.email,
              },
              template: "MJS23WZB08M4ZRG9KDNF675BM6HR",
              data: {
                customerName: user?.name,
                orderNumber: order?.id,
                products: _products,
              },
            },
          });
        });

      return user;
    },

    updateOrder: async (_, args) => {
      const { action, id } = args;

      let order;

      if (action == "dispatch") {
        order = await Order.findById(id)
          .then((doc) => {
            doc.dispatchTimestamp = Date.now().toString();
            doc.save();
            return doc;
          })
          .catch((err) => {
            console.log("Oh! Dark");
          });
      }

      if (action == "deliver") {
        order = await Order.findById(id)
          .then((doc) => {
            doc.deliveryTimestamp = Date.now().toString();
            doc.save();
            return doc;
          })
          .catch((err) => {
            console.log("Oh! Dark");
          });
      }

      return order;
    },

    updateAdmin: async (_, args) => {
      let user = await Admin.findByIdAndUpdate(args?.id, omit(args, ["id"]));
      return user;
    },
  },
};

export default resolvers;
