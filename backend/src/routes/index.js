import express from 'express';
import adminRoutes from './admin.js';
import authRoutes from './auth.js';
import backupsRoutes from './backups.js';
import bannersRoutes from './banners.js';
import couponsRoutes from './coupons.js';
import discoverRoutes from './discover.js';
import inventoryRoutes from './inventory.js';
import ordersRoutes from './orders.js';
import productsRoutes from './products.js';
import recommendationsRoutes from './recommendations.js';
import regionsRoutes from './regions.js';
import reservationsRoutes from './reservations.js';
import shopsRoutes from './shops.js';
import subscriptionsRoutes from './subscriptions.js';
import usersRoutes from './users.js';

const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/orders', ordersRoutes);
apiRouter.use('/shops', shopsRoutes);
apiRouter.use('/coupons', couponsRoutes);
apiRouter.use('/regions', regionsRoutes);
apiRouter.use('/backups', backupsRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/discover', discoverRoutes);
apiRouter.use('/recommendations', recommendationsRoutes);
apiRouter.use('/reservations', reservationsRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/banners', bannersRoutes);

export default apiRouter;
