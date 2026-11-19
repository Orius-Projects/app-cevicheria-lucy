import { Router } from 'express';
import { authRouter } from './auth.routes';
import { tableRouter, tableSessionRouter } from './table.routes';
import { shiftRouter } from './shift.routes';
import { menuRouter } from './menu.routes';
import { orderRouter, kitchenRouter } from './order.routes';
import { settingsRouter } from './settings.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/tables', tableRouter);
apiRouter.use('/table-sessions', tableSessionRouter);
apiRouter.use('/shifts', shiftRouter);
apiRouter.use(menuRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/kitchen', kitchenRouter);
apiRouter.use('/settings', settingsRouter);

export { apiRouter };
export default apiRouter;
