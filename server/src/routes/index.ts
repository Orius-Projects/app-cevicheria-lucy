import { Router } from 'express';
import { authRouter } from './auth.routes';
import { tableRouter, tableSessionRouter } from './table.routes';
import { shiftRouter } from './shift.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/tables', tableRouter);
apiRouter.use('/table-sessions', tableSessionRouter);
apiRouter.use('/shifts', shiftRouter);

export { apiRouter };
export default apiRouter;
