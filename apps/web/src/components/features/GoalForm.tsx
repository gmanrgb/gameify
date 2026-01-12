import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateGoalSchema, type CreateGoalInput, type GoalWithRecurrence } from '@questlog/shared';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ColorPicker } from '../ui/ColorPicker';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface GoalFormProps {
  initialData?: GoalWithRecurrence;
  onSubmit: (data: CreateGoalInput) => Promise<void>;
  onCancel: () => void;
}

export function GoalForm({ initialData, onSubmit, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateGoalInput>({
    resolver: zodResolver(CreateGoalSchema),
    defaultValues: {
      title: initialData?.title || '',
      cadence: initialData?.cadence || 'daily',
      color: initialData?.color || '#7C3AED',
      xpPerCheck: initialData?.xpPerCheck || 10,
      recurrence: {
        weeklyTarget: initialData?.recurrence?.weeklyTarget || undefined,
        monthlyTarget: initialData?.recurrence?.monthlyTarget || undefined,
        weekdaysMask: initialData?.recurrence?.weekdaysMask || undefined,
      },
    },
  });

  const cadence = watch('cadence');
  const color = watch('color');

  const handleFormSubmit = async (data: CreateGoalInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Goal Title"
        placeholder="e.g., Morning Routine, Read 20 pages"
        {...register('title')}
        error={errors.title?.message}
      />

      <Select
        label="Cadence"
        options={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        {...register('cadence')}
        error={errors.cadence?.message}
      />

      {cadence === 'weekly' && (
        <Input
          label="Weekly Target (times per week)"
          type="number"
          min={1}
          max={7}
          defaultValue={3}
          {...register('recurrence.weeklyTarget', { valueAsNumber: true })}
          error={errors.recurrence?.weeklyTarget?.message}
        />
      )}

      {cadence === 'monthly' && (
        <Input
          label="Monthly Target (times per month)"
          type="number"
          min={1}
          max={31}
          defaultValue={10}
          {...register('recurrence.monthlyTarget', { valueAsNumber: true })}
          error={errors.recurrence?.monthlyTarget?.message}
        />
      )}

      <Input
        label="XP per Check-in"
        type="number"
        min={1}
        max={100}
        {...register('xpPerCheck', { valueAsNumber: true })}
        error={errors.xpPerCheck?.message}
        helper="How much XP to earn for each completion (1-100)"
      />

      <ColorPicker
        label="Goal Color"
        value={color}
        onChange={(c) => setValue('color', c)}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {initialData ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}
