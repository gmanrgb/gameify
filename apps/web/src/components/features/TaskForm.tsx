import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTaskSchema, type CreateTaskInput, type Task } from '@questlog/shared';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useState } from 'react';

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      title: initialData?.title || '',
      notes: initialData?.notes || '',
    },
  });

  const handleFormSubmit = async (data: CreateTaskInput) => {
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
        label="Task Title"
        placeholder="e.g., Meditate for 10 minutes"
        {...register('title')}
        error={errors.title?.message}
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-text-secondary">
          Notes (optional)
        </label>
        <textarea
          className="w-full px-4 py-2.5 bg-bg-tertiary border border-white/10 rounded-lg text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          rows={3}
          placeholder="Add any additional notes..."
          {...register('notes')}
        />
        {errors.notes && (
          <p className="text-sm text-red-400">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {initialData ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}
