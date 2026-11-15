import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DoseCard } from '../components/doses/DoseCard.jsx';
import { describe, it, expect, vi } from 'vitest';

describe('DoseCard Component', () => {
  const pendingDose = {
    id: 'dose_123',
    medicationName: 'Metformin',
    dosage: '500 mg',
    scheduledTime: '08:00',
    mealRelation: 'after_food',
    status: 'pending',
    colour: '#10b981',
  };

  it('renders pending dose with Take and Skip buttons and triggers onTake', () => {
    const handleTake = vi.fn();
    const handleSkip = vi.fn();

    render(
      <DoseCard
        dose={pendingDose}
        onTake={handleTake}
        onSkip={handleSkip}
      />
    );

    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('500 mg')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('After Food')).toBeInTheDocument();

    const takeBtn = screen.getByRole('button', { name: /take/i });
    fireEvent.click(takeBtn);
    expect(handleTake).toHaveBeenCalledWith('dose_123');
  });

  it('renders taken dose with markedByName and Undo button', () => {
    const takenDose = {
      ...pendingDose,
      status: 'taken',
      markedByName: 'Priya (Daughter)',
      markedAt: new Date().toISOString(),
    };
    const handleUndo = vi.fn();

    render(
      <DoseCard
        dose={takenDose}
        onUndo={handleUndo}
      />
    );

    expect(screen.getByText(/marked taken by/i)).toBeInTheDocument();
    expect(screen.getByText(/Priya \(Daughter\)/i)).toBeInTheDocument();

    const undoBtn = screen.getByRole('button', { name: /undo/i });
    expect(undoBtn).toBeInTheDocument();
    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledWith('dose_123');
  });
});
