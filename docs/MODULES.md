# System Architecture and Module Structure

This document describes the modular architecture of the POS Backend system, outlining each module's purpose, managed data, operations, and relationships.  

## System Architecture Overview

```txt
modules/
├── auth/
├── setup/
│   ├── user/
│   ├── category/
│   ├── manufacture/
│   ├── product/
│   └── unit/
├── inventory/
│   ├── conversion/
│   └── stock/
└── transaction/
    ├── sales/
    ├── purchase/
    ├── adjustment/
    └── transaction-list/
```

---

## Auth Module

**Description**: Handles authentication and session control.  
**Data Managed**: User login credentials and authentication tokens.  
**Operations**: Login, token verification, logout.  
**Relations**: All modules requiring protected access.  

---

## Setup Module

Manages master data used throughout the system.  

### User Submodule

**Description**: Manages accounts of users who operate the POS system.  
**Data Managed**: Usernames, display names, passwords, roles (admin or cashier), and activation status.  
**Operations**: Add, view, update, deactivate/activate user accounts.  
**Relations**: Used in transaction logs and for permission control.  

### Category Submodule

**Description**: Organizes products into logical groupings.  
**Data Managed**: Product categories such as food, beverage, or electronics.  
**Operations**: Add, view, update, delete categories.  
**Relations**: Linked to products.  

### Manufacture Submodule

**Description**: Stores information about product brands or suppliers.  
**Data Managed**: Manufacturer or brand names.  
**Operations**: Add, view, update, delete manufacturers.  
**Relations**: Linked to products.  

### Product Submodule

**Description**: Stores product details for items sold through the POS system.  
**Data Managed**: Product names, descriptions, images, codes (SKU/barcode), category, brand, and default unit.  
**Operations**: Add, view, update, delete products with support for filtering and pagination.  
**Relations**: Connected to categories, manufacturers, and units.  

### Unit Submodule

**Description**: Defines measurement units used for product quantities.  
**Data Managed**: Unit names such as "piece", "box", or "liter".  
**Operations**: Add, view, update, delete units.  
**Relations**: Used in products and unit conversions.  

---

## Inventory Module

**Purpose**: Manages product stock levels and unit conversions.  

### Conversion

**Purpose**: Defines rules to convert a product from one unit to another, with associated prices.  
**Managed Data**: Source unit, target unit, conversion quantity, price.  
**Operations**: Add, edit, delete conversion rules for each product.  
**Relations**: Connected to products and units from setup module.  

### Stock

**Purpose**: Displays the current quantity of products in stock.  
**Managed Data**: Real-time stock quantities.  
**Operations**: View stock on hand, check stock per product.  
**Relations**: Linked to products and affected by all transaction types.  

---

## Transaction Module

**Purpose**: Handles all sales, purchases, stock adjustments, and transaction recordkeeping.  

### Sales

**Purpose**: Records product sales (cashier function).  
**Managed Data**: Sold products, quantity, payment type, total.  
**Operations**: Create sales transactions.  
**Relations**: Reduces stock levels, references users and products.  

### Purchase

**Purpose**: Records inventory purchases from suppliers.  
**Managed Data**: Purchased items, supplier info, cost.  
**Operations**: Create purchase transactions.  
**Relations**: Increases stock levels, linked to products and manufacturers.  

### Adjustment

**Purpose**: Corrects or initializes product stock levels.  
**Managed Data**: Quantity changes with reasons (e.g. opening balance, stock opname).  
**Operations**: Create adjustment entries.  
**Relations**: Directly modifies stock levels, references users and products.  

### Transaction List

**Purpose**: Lists all purchase and sales transactions for audit or review.  
**Managed Data**: Summary of all past transactions.  
**Operations**: Filter, sort, search, and edit transaction records if needed.  
**Relations**: Aggregates data from sales, purchase, and adjustment modules.  

---

## See Also

* [API Documentation](./API.md)  
* [Project README](../README.md)  
