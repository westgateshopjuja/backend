import {
  Admin,
  User,
  Order,
  Product,
  Section,
  Transaction,
} from "./models/index.js";
import cloudinary from "cloudinary";
import { CourierClient } from "@trycourier/courier";
import dotenv from "dotenv";
dotenv.config();

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

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

        statPage["totalProducts"] = (await Product.find()).length;

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

      let variantsJS = JSON.parse(variants);
      let additionalInformationJS = JSON.parse(additionalInformation);

      let _images = [];
      let _variants = [];

      for (let image of images) {
        let { url } = await cloudinary.v2.uploader.upload(image, {
          public_id: "",
          folder: "products",
        });
        _images.push(url);
      }

      for (let _variant of variantsJS) {
        if (_variant?.thumbnail) {
          let { url } = await cloudinary.v2.uploader.upload(
            _variant?.thumbnail,
            {
              public_id: "",
              folder: "thumbnails",
            }
          );
          let variant = {
            thumbnail: url,
            label: _variant?.label,
            price: _variant?.price,
          };
          _variants?.push(variant);
        } else {
          let variant = {
            thumbnail: null,
            label: _variant?.label,
            price: _variant?.price,
          };
          _variants?.push(variant);
        }
      }

      let newProduct = new Product({
        name,
        description,
        category,
        variants: _variants,
        additionalInformation: additionalInformationJS,
        images: _images,
      });

      let product = newProduct.save();
      return product;
    },

    createAdmin: async (_, args) => {
      let { name, email, levelClearance } = args;

      let newAdmin = new Admin({
        name,
        email,
        levelClearance,
        password: "thrift",
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
