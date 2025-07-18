import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/setup/category/category.routes';
import manufactureRoutes from './modules/setup/manufacture/manufacture.routes';
import userRoutes from './modules/setup/user/user.routes';
import unitRoutes from './modules/setup/unit/unit.routes';
import productRoutes from './modules/setup/product/product.routes';
import conversionRoutes from './modules/inventory/conversion/conversion.routes';
import stockRoutes from './modules/inventory/stock/stock.routes';
import adjustmentRoutes from './modules/transaction/adjustment/adjustment.routes';
import purchaseRoutes from './modules/transaction/purchase/purchase.routes';
import saleRoutes from './modules/transaction/sale/sale.routes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount setup routes
router.use('/setup/category', categoryRoutes);
router.use('/setup/manufacture', manufactureRoutes);
router.use('/setup/user', userRoutes);
router.use('/setup/unit', unitRoutes);
router.use('/setup/product', productRoutes);

// Mount inventory routes
router.use('/inventory/conversion', conversionRoutes);
router.use('/inventory/stock', stockRoutes);

// Mount transaction routes
router.use('/transaction/adjustment', adjustmentRoutes);
router.use('/transaction/purchase', purchaseRoutes);
router.use('/transaction/sale', saleRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'POS Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to POS Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify',
        logout: 'POST /api/auth/logout'
      },
      setup: {
        category: {
          list: 'GET /api/setup/category',
          get: 'GET /api/setup/category/:id',
          create: 'POST /api/setup/category',
          update: 'PUT /api/setup/category/:id',
          delete: 'DELETE /api/setup/category/:id'
        },
        manufacture: {
          list: 'GET /api/setup/manufacture',
          get: 'GET /api/setup/manufacture/:id',
          create: 'POST /api/setup/manufacture',
          update: 'PUT /api/setup/manufacture/:id',
          delete: 'DELETE /api/setup/manufacture/:id'
        },
        user: {
          listActive: 'GET /api/setup/user',
          listInactive: 'GET /api/setup/user/inactive',
          get: 'GET /api/setup/user/:id',
          create: 'POST /api/setup/user',
          update: 'PUT /api/setup/user/:id',
          delete: 'DELETE /api/setup/user/:id',
          toggle: 'PATCH /api/setup/user/:id/toggle'
        },
        unit: {
          list: 'GET /api/setup/unit',
          get: 'GET /api/setup/unit/:id',
          create: 'POST /api/setup/unit',
          update: 'PUT /api/setup/unit/:id',
          delete: 'DELETE /api/setup/unit/:id'
        },
        product: {
          list: 'GET /api/setup/product',
          get: 'GET /api/setup/product/:id',
          create: 'POST /api/setup/product',
          update: 'PUT /api/setup/product/:id',
          delete: 'DELETE /api/setup/product/:id'
        }
      },
      inventory: {
        conversion: {
          list: 'GET /api/inventory/conversion',
          get: 'GET /api/inventory/conversion/:id',
          create: 'POST /api/inventory/conversion',
          update: 'PUT /api/inventory/conversion/:id',
          delete: 'DELETE /api/inventory/conversion/:id',
          getByProduct: 'GET /api/inventory/conversion/product/:productId'
        },
        stock: {
          list: 'GET /api/inventory/stock',
          getHistory: 'GET /api/inventory/stock/:productId'
        }
      },
      transaction: {
        adjustment: {
          create: 'POST /api/transaction/adjustment',
          get: 'GET /api/transaction/adjustment/:id',
          update: 'PUT /api/transaction/adjustment/:id'
        },
        purchase: {
          create: 'POST /api/transaction/purchase',
          get: 'GET /api/transaction/purchase/:id',
          update: 'PUT /api/transaction/purchase/:id'
        },
        sale: {
          create: 'POST /api/transaction/sale',
          get: 'GET /api/transaction/sale/:id',
          update: 'PUT /api/transaction/sale/:id'
        }
      },
      health: 'GET /api/health'
    }
  });
});

export default router; 