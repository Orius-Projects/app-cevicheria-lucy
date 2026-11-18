import { Request, Response, NextFunction } from 'express';
import {
  openShift,
  getCurrentShift,
  closeShift,
  getShiftSummary
} from '../services/shift.service';
import { UnauthorizedError } from '../middlewares/error';

export async function createShift(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const shift = await openShift(req.body, req.user);
    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
}

export async function getCurrent(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const shift = await getCurrentShift();
    res.status(200).json(shift);
  } catch (error) {
    next(error);
  }
}

export async function close(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Usuario no autenticado');
    }

    const { observations } = req.body || {};
    const summary = await closeShift(req.params.id, req.user, observations);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const summary = await getShiftSummary(req.params.id);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}
