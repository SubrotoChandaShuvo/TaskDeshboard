import { CreateTaskDTO, UpdateTaskDTO, TaskStatus, TaskPriority } from '@/types/task';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData?: T;
}

const VALID_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const VALID_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function validateCreateTask(input: unknown): ValidationResult<CreateTaskDTO> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      isValid: false,
      errors: { _general: 'Request body must be a valid JSON object.' },
    };
  }

  const data = input as Record<string, unknown>;

  // Title validation
  if (typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.title = 'Title is required.';
  } else {
    const trimmed = data.title.trim();
    if (trimmed.length < 3) {
      errors.title = 'Title must be at least 3 characters long.';
    } else if (trimmed.length > 100) {
      errors.title = 'Title cannot exceed 100 characters.';
    }
  }

  // Description validation
  let sanitizedDescription = '';
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be text.';
    } else {
      sanitizedDescription = data.description.trim();
      if (sanitizedDescription.length > 1000) {
        errors.description = 'Description cannot exceed 1000 characters.';
      }
    }
  }

  // Status validation
  let sanitizedStatus: TaskStatus = 'TODO';
  if (data.status !== undefined && data.status !== null) {
    if (typeof data.status !== 'string' || !VALID_STATUSES.includes(data.status as TaskStatus)) {
      errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}.`;
    } else {
      sanitizedStatus = data.status as TaskStatus;
    }
  }

  // Priority validation
  let sanitizedPriority: TaskPriority = 'MEDIUM';
  if (data.priority !== undefined && data.priority !== null) {
    if (typeof data.priority !== 'string' || !VALID_PRIORITIES.includes(data.priority as TaskPriority)) {
      errors.priority = `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`;
    } else {
      sanitizedPriority = data.priority as TaskPriority;
    }
  }

  // Due Date validation
  let sanitizedDueDate: string | null = null;
  if (data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '') {
    if (typeof data.dueDate !== 'string') {
      errors.dueDate = 'Due date must be a valid ISO date string.';
    } else {
      const parsed = new Date(data.dueDate);
      if (isNaN(parsed.getTime())) {
        errors.dueDate = 'Due date is invalid.';
      } else {
        sanitizedDueDate = parsed.toISOString();
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    sanitizedData: {
      title: (data.title as string).trim(),
      description: sanitizedDescription,
      status: sanitizedStatus,
      priority: sanitizedPriority,
      dueDate: sanitizedDueDate,
    },
  };
}

export function validateUpdateTask(input: unknown): ValidationResult<UpdateTaskDTO> {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      isValid: false,
      errors: { _general: 'Request body must be a valid JSON object.' },
    };
  }

  const data = input as Record<string, unknown>;
  const sanitized: UpdateTaskDTO = {};
  let fieldsProvided = 0;

  if (data.title !== undefined) {
    fieldsProvided++;
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.title = 'Title cannot be empty.';
    } else {
      const trimmed = data.title.trim();
      if (trimmed.length < 3) {
        errors.title = 'Title must be at least 3 characters long.';
      } else if (trimmed.length > 100) {
        errors.title = 'Title cannot exceed 100 characters.';
      } else {
        sanitized.title = trimmed;
      }
    }
  }

  if (data.description !== undefined) {
    fieldsProvided++;
    if (data.description === null) {
      sanitized.description = '';
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be text.';
    } else {
      const trimmed = data.description.trim();
      if (trimmed.length > 1000) {
        errors.description = 'Description cannot exceed 1000 characters.';
      } else {
        sanitized.description = trimmed;
      }
    }
  }

  if (data.status !== undefined) {
    fieldsProvided++;
    if (typeof data.status !== 'string' || !VALID_STATUSES.includes(data.status as TaskStatus)) {
      errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}.`;
    } else {
      sanitized.status = data.status as TaskStatus;
    }
  }

  if (data.priority !== undefined) {
    fieldsProvided++;
    if (typeof data.priority !== 'string' || !VALID_PRIORITIES.includes(data.priority as TaskPriority)) {
      errors.priority = `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`;
    } else {
      sanitized.priority = data.priority as TaskPriority;
    }
  }

  if (data.dueDate !== undefined) {
    fieldsProvided++;
    if (data.dueDate === null || data.dueDate === '') {
      sanitized.dueDate = null;
    } else if (typeof data.dueDate !== 'string') {
      errors.dueDate = 'Due date must be a valid ISO date string or null.';
    } else {
      const parsed = new Date(data.dueDate);
      if (isNaN(parsed.getTime())) {
        errors.dueDate = 'Due date is invalid.';
      } else {
        sanitized.dueDate = parsed.toISOString();
      }
    }
  }

  if (fieldsProvided === 0) {
    return {
      isValid: false,
      errors: { _general: 'At least one field must be provided to update.' },
    };
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    sanitizedData: sanitized,
  };
}
