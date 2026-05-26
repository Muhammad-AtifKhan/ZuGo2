import prisma from '../lib/prisma';
import { Request, Response } from 'express';


// Get all tours for the current passenger
export const getMyTours = async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).user.uid;
    const tours = await prisma.tour.findMany({
      where: { passengerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tours);
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Create a new tour
export const createTour = async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).user.uid;
    const { name, description, startDate, endDate, status } = req.body;

    const tour = await prisma.tour.create({
      data: {
        passengerId,
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'planning'
      }
    });

    res.status(201).json(tour);
  } catch (error) {
    console.error('Error creating tour:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete a tour
export const deleteTour = async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).user.uid;
    const id = req.params.id as string;

    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour || tour.passengerId !== passengerId) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    await prisma.tour.delete({ where: { id } });

    res.json({ success: true, message: 'Tour deleted' });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

