import { z } from 'zod';
import { getDb } from '../config/db.js';

const appointmentSchema = z.object({
  doctor: z.string().min(1, 'Doctor name is required'),
  specialty: z.string().min(1, 'Specialty is required (e.g. Cardiologist, General Physician)'),
  dateTimeUtc: z.string().datetime('Valid ISO UTC date-time is required'),
  location: z.string().min(1, 'Clinic or hospital location is required'),
  notes: z.string().optional().default(''),
  accompaniedBy: z.string().nullable().optional().default(null),
  accompaniedByName: z.string().nullable().optional().default(null),
});

export const getAppointments = async (req, res, next) => {
  try {
    const { filter = 'all', doctor } = req.query;
    const db = getDb();

    const apptsSnap = await db.collection('appointments')
      .where('profileId', '==', req.profileId)
      .get();

    let appointments = apptsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const nowUtc = new Date().toISOString();

    if (filter === 'upcoming') {
      appointments = appointments.filter((a) => a.dateTimeUtc >= nowUtc);
      appointments.sort((a, b) => (a.dateTimeUtc > b.dateTimeUtc ? 1 : -1));
    } else if (filter === 'past') {
      appointments = appointments.filter((a) => a.dateTimeUtc < nowUtc);
      appointments.sort((a, b) => (a.dateTimeUtc < b.dateTimeUtc ? 1 : -1));
    } else {
      appointments.sort((a, b) => (a.dateTimeUtc > b.dateTimeUtc ? 1 : -1));
    }

    if (doctor) {
      const lowerDoc = doctor.toLowerCase();
      appointments = appointments.filter((a) => a.doctor.toLowerCase().includes(lowerDoc));
    }

    return res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    next(err);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const validated = appointmentSchema.parse(req.body);
    const db = getDb();
    const now = new Date().toISOString();

    const apptRef = await db.collection('appointments').add({
      profileId: req.profileId,
      ...validated,
      reminder24hSent: false,
      reminder1hSent: false,
      createdBy: req.memberId,
      createdByName: req.member.displayName,
      createdAt: now,
      updatedAt: now,
    });

    const newAppt = {
      id: apptRef.id,
      profileId: req.profileId,
      ...validated,
      reminder24hSent: false,
      reminder1hSent: false,
      createdBy: req.memberId,
      createdByName: req.member.displayName,
      createdAt: now,
    };

    // Activity log
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'added_appointment',
      entityType: 'appointment',
      entityId: apptRef.id,
      details: {
        doctor: newAppt.doctor,
        specialty: newAppt.specialty,
        dateTimeUtc: newAppt.dateTimeUtc,
      },
      createdAt: now,
    });

    // In-app notifications to other members
    const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
    membersSnap.forEach(async (doc) => {
      if (doc.id !== req.memberId) {
        await db.collection('notifications').add({
          profileId: req.profileId,
          memberId: doc.id,
          type: 'appointment_added',
          title: 'New Doctor Appointment',
          body: `${req.member.displayName} scheduled an appointment with Dr. ${newAppt.doctor} (${newAppt.specialty}).`,
          readAt: null,
          createdAt: now,
        });
      }
    });

    return res.status(201).json({
      success: true,
      data: newAppt,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = appointmentSchema.partial().parse(req.body);
    const db = getDb();

    const apptRef = db.collection('appointments').doc(id);
    const apptDoc = await apptRef.get();

    if (!apptDoc.exists || apptDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', code: 'NOT_FOUND' },
      });
    }

    const currentAppt = apptDoc.data();
    const now = new Date().toISOString();
    const updatePayload = {
      ...validated,
      updatedAt: now,
    };

    await apptRef.update(updatePayload);

    // Activity log
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'updated_appointment',
      entityType: 'appointment',
      entityId: id,
      details: { doctor: currentAppt.doctor, updatedFields: Object.keys(validated) },
      createdAt: now,
    });

    return res.status(200).json({
      success: true,
      data: { id, ...currentAppt, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const apptRef = db.collection('appointments').doc(id);
    const apptDoc = await apptRef.get();

    if (!apptDoc.exists || apptDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', code: 'NOT_FOUND' },
      });
    }

    const doctorName = apptDoc.data().doctor;
    await apptRef.delete();

    // Activity log
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'deleted_appointment',
      entityType: 'appointment',
      entityId: id,
      details: { doctor: doctorName },
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: { message: `Appointment with Dr. ${doctorName} removed.` },
    });
  } catch (err) {
    next(err);
  }
};

export const accompanyAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const apptRef = db.collection('appointments').doc(id);
    const apptDoc = await apptRef.get();

    if (!apptDoc.exists || apptDoc.data().profileId !== req.profileId) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found', code: 'NOT_FOUND' },
      });
    }

    const apptData = apptDoc.data();
    const now = new Date().toISOString();

    const updatePayload = {
      accompaniedBy: req.memberId,
      accompaniedByName: req.member.displayName,
      accompaniedAt: now,
    };

    await apptRef.update(updatePayload);

    // Log activity
    await db.collection('activity').add({
      profileId: req.profileId,
      actorId: req.memberId,
      action: 'accompanied_appointment',
      entityType: 'appointment',
      entityId: id,
      details: { doctor: apptData.doctor, companion: req.member.displayName },
      createdAt: now,
    });

    // Notify other circle members
    const membersSnap = await db.collection('members').where('profileId', '==', req.profileId).get();
    membersSnap.forEach(async (doc) => {
      if (doc.id !== req.memberId) {
        await db.collection('notifications').add({
          profileId: req.profileId,
          memberId: doc.id,
          type: 'appointment_accompanied',
          title: 'Appointment Helper Confirmed',
          body: `${req.member.displayName} will accompany to Dr. ${apptData.doctor}'s appointment.`,
          readAt: null,
          createdAt: now,
        });
      }
    });

    const updatedSnap = await apptRef.get();
    return res.status(200).json({
      success: true,
      data: updatedSnap.data(),
    });
  } catch (err) {
    next(err);
  }
};
