import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../api/client';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { GoalForm } from '../components/features/GoalForm';
import { TaskForm } from '../components/features/TaskForm';
import type { GoalWithRecurrence, Task, CreateGoalInput, CreateTaskInput } from '@questlog/shared';

type Tab = 'active' | 'archived';

export function Goals() {
  const { goals, archivedGoals, loadGoals, loadArchivedGoals, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithRecurrence | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalTasks, setGoalTasks] = useState<Record<string, Task[]>>({});
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
    loadArchivedGoals();
  }, [loadGoals, loadArchivedGoals]);

  const displayGoals = activeTab === 'active' ? goals : archivedGoals;

  const loadTasksForGoal = async (goalId: string) => {
    if (goalTasks[goalId]) return;
    try {
      const { tasks } = await api.getTasks(goalId);
      setGoalTasks(prev => ({ ...prev, [goalId]: tasks }));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleCreateGoal = async (data: CreateGoalInput) => {
    try {
      await api.createGoal(data);
      showToast('success', 'Goal created successfully!');
      setIsGoalModalOpen(false);
      loadGoals();
    } catch (error) {
      showToast('error', 'Failed to create goal');
    }
  };

  const handleUpdateGoal = async (data: CreateGoalInput) => {
    if (!editingGoal) return;
    try {
      await api.updateGoal(editingGoal.id, data);
      showToast('success', 'Goal updated successfully!');
      setEditingGoal(null);
      loadGoals();
    } catch (error) {
      showToast('error', 'Failed to update goal');
    }
  };

  const handleArchiveGoal = async (goalId: string) => {
    try {
      await api.archiveGoal(goalId);
      showToast('info', 'Goal archived');
      loadGoals();
      loadArchivedGoals();
    } catch (error) {
      showToast('error', 'Failed to archive goal');
    }
  };

  const handleUnarchiveGoal = async (goalId: string) => {
    try {
      await api.unarchiveGoal(goalId);
      showToast('success', 'Goal restored');
      loadGoals();
      loadArchivedGoals();
    } catch (error) {
      showToast('error', 'Failed to restore goal');
    }
  };

  const handleAddTask = async (data: CreateTaskInput) => {
    if (!selectedGoalId) return;
    try {
      await api.createTask(selectedGoalId, data);
      showToast('success', 'Task added!');
      setIsTaskModalOpen(false);
      // Refresh tasks
      const { tasks } = await api.getTasks(selectedGoalId);
      setGoalTasks(prev => ({ ...prev, [selectedGoalId]: tasks }));
      loadGoals();
    } catch (error) {
      showToast('error', 'Failed to add task');
    }
  };

  const handleDeleteTask = async (taskId: string, goalId: string) => {
    try {
      await api.deleteTask(taskId);
      showToast('info', 'Task removed');
      const { tasks } = await api.getTasks(goalId);
      setGoalTasks(prev => ({ ...prev, [goalId]: tasks }));
      loadGoals();
    } catch (error) {
      showToast('error', 'Failed to remove task');
    }
  };

  const toggleExpandGoal = (goalId: string) => {
    if (expandedGoal === goalId) {
      setExpandedGoal(null);
    } else {
      setExpandedGoal(goalId);
      loadTasksForGoal(goalId);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-display gradient-text">Goals</h1>
        <Button onClick={() => setIsGoalModalOpen(true)}>
          + New Goal
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-white/10 text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Active ({goals.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'archived'
              ? 'bg-white/10 text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Archived ({archivedGoals.length})
        </button>
      </div>

      {/* Goals List */}
      {displayGoals.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">{activeTab === 'active' ? '🎯' : '📦'}</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {activeTab === 'active' ? 'No Active Goals' : 'No Archived Goals'}
          </h2>
          <p className="text-text-secondary">
            {activeTab === 'active' 
              ? 'Create your first goal to get started!'
              : 'Archived goals will appear here.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayGoals.map((goal) => (
            <Card key={goal.id} accentColor={goal.color}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
                    🎯
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{goal.title}</h3>
                    <p className="text-sm text-text-secondary">
                      {goal.cadence} • {goal.xpPerCheck} XP
                      {goal.taskCount > 0 && ` • ${goal.taskCount} tasks`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {goal.currentStreak > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded text-sm">
                      🔥 {goal.currentStreak}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpandGoal(goal.id)}
                  >
                    {expandedGoal === goal.id ? '▲' : '▼'}
                  </Button>
                </div>
              </CardHeader>
              
              {expandedGoal === goal.id && (
                <CardBody>
                  {/* Tasks */}
                  {goalTasks[goal.id]?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-text-secondary mb-2">Tasks</h4>
                      <div className="space-y-2">
                        {goalTasks[goal.id].map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg"
                          >
                            <span className="text-text-primary">{task.title}</span>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id, goal.id)}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setIsTaskModalOpen(true);
                      }}
                    >
                      + Add Task
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGoal(goal)}
                    >
                      Edit
                    </Button>
                    {activeTab === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveGoal(goal.id)}
                      >
                        Archive
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnarchiveGoal(goal.id)}
                      >
                        Restore
                      </Button>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{goal.currentStreak}</p>
                      <p className="text-xs text-text-secondary">Current Streak</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{goal.bestStreak}</p>
                      <p className="text-xs text-text-secondary">Best Streak</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">{goal.freezeTokens}</p>
                      <p className="text-xs text-text-secondary">Freeze Tokens</p>
                    </div>
                  </div>
                </CardBody>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title="Create New Goal"
      >
        <GoalForm
          onSubmit={handleCreateGoal}
          onCancel={() => setIsGoalModalOpen(false)}
        />
      </Modal>

      {/* Edit Goal Modal */}
      <Modal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        title="Edit Goal"
      >
        {editingGoal && (
          <GoalForm
            initialData={editingGoal}
            onSubmit={handleUpdateGoal}
            onCancel={() => setEditingGoal(null)}
          />
        )}
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Task"
      >
        <TaskForm
          onSubmit={handleAddTask}
          onCancel={() => setIsTaskModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
