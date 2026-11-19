import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/order.service';
import { UnauthorizedError } from '../middlewares/error';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const result = await orderService.createOrder(req.body, req.user);
    const statusCode = result.isIdempotent ? 200 : 201;
    res.status(statusCode).json(result.order);
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await orderService.listOrders(req.query);
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}

export async function ready(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const version = typeof req.body.version === 'number' ? req.body.version : 0;
    const order = await orderService.markOrderReady(req.params.id, version, req.user);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}

export async function deliver(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const version = typeof req.body.version === 'number' ? req.body.version : 0;
    const order = await orderService.deliverOrder(req.params.id, version, req.user);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { reason, version } = req.body;
    const result = await orderService.cancelOrder(
      req.params.id,
      reason,
      typeof version === 'number' ? version : 0,
      req.user
    );
    res.status(200).json({
      ...result.order,
      ...(result.warning ? { warning: result.warning } : {})
    });
  } catch (error) {
    next(error);
  }
}

export async function manualClose(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { reason } = req.body;
    const order = await orderService.manualCloseOrder(req.params.id, reason, req.user);
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
}

export async function getKitchenBoard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const board = await orderService.getKitchenBoard();
    res.status(200).json(board);
  } catch (error) {
    next(error);
  }
}
