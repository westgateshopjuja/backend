const typeDefs = `
type Admin {
    id: ID!
    email: String
    password: String
    name: String
    phoneNumber: String
    levelClearance: String
    removed: Boolean
    createdAt: String
}

type User {
    id: ID!
    name: String
    email: String    
    image: String
    emailVerified: Boolean
    phoneNumber: String
    cart: [CartItem]
    saved: [Product]
    addresses: [Address]
}

type CartItem {
    id: ID
    product: Product
    quantity: Int
    variant: String
}

type Address {
    id: ID
    label: String
    lat: Float
    lng: Float
    default: Boolean
}


type Product {
    id: ID!
    name: String
    description: String
    category: String
    images: [String]
    variants: [Variant]
    additionalInformation: [Additional]
    reviews: [Review]
    createdAt: String
    deleted: Boolean
}

type Sale {
    startTime: String
    endTime: String
    salePrice: Int  
}

type Additional {
    label: String
    value: String
}

type Variant {
    thumbnail: String
    price: Float
    label: String
    sale: Sale
    available: Boolean
}

type Order {
    id: ID
    items: [OrderItem]
    customer: User
    deliveryLocation: DeliveryLocation
    payment: Transaction
    createdAt: String
    deliveryTimestamp: String
    dispatchTimestamp: String
    pickUpTimestamp: String
}

type Transaction {
    id: ID
    code: String
    timestamp: String
    amount: Int   
    phoneNumber: String
    createdAt: String
}

type OrderItem {
    product: Product
    variant: String
    salePrice: Int
    quantity: Int
}

type DeliveryLocation {
    lat: Float
    lng: Float
}



type Review {
    name: String
    rating: Float
    timestamp: String
    message: String
}

type Section {
    id: ID!
    instagram: String
    twitter: String
    facebook: String
    phoneNumber: String
    sliders: [String]
    termsOfService: String
    shipping: String
    privacyPolicy: String
    returnAndExchanges: String
}


type StatPage {
    totalSales: Int
    totalOrders: Int
    totalProducts: Int
    chartData: [ChartData]
    fastestMoving: [MovingProduct]
    slowestMoving: [MovingProduct]
}

type ChartData {
    label: String
    value: Int
}

type MovingProduct{
    product: Product
    ordersPerMonth: Int
}


type Query { 

    getProducts: [Product]
    getAdmins: [Admin]
    getProduct(id: ID): Product
    getUser(email: String): User  
    getOrders(customer: String): [Order]  
    getAllOrders: [Order]
    getAdmin(
        email: String
        id: ID
        password: String
    ): Admin
    getStatPage: StatPage
}

type Mutation {
    addProduct(
        name: String
        description: String
        category: String,
        variants: String
        additionalInformation: String  
        images: [String]      
    ) : Product
    createAdmin(
        email: String
        name: String
        levelClearance: String
    ) : Admin    
    addToCart(
        customer: String
        product: ID
        variant: String
    ) : User
    updateCart(
        id: ID
        removal: Boolean
        quantity: Int
        email: String
    ): User
    saveUnsave(
        product: ID
        customer: String
    ) : User
    updateProfile(
        email: String
        name: String
        phoneNumber: String
    ) : User
    addAddress(
        label: String
        lat: Float
        lng: Float
        email: String
    ) : User
    mutateAddress(
        action: String
        id: ID
        email: String
        default: Boolean
    ) : User
    checkout(
        items: String
        customer: ID
        payment: String
        _deliveryLocation: String
    ): User
    updateOrder(
        action: String
        id: ID
    ): Order
    updateAdmin(
        id: ID
        name: String
        phoneNumber: String
        email: String
        password: String
        removed: Boolean
    ): Admin
    updateProduct(
        id: ID
        name: String
        description: String
        variants: String
        additionalInformation: String  
        available: Boolean
        sale: String
        deleted: Boolean
    ): Product
}

`;

export default typeDefs;
