import { User, Role, ValidationError } from '../types';

export class Validator {
  static validateUser(user: Partial<User>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!user.username) {
      errors.push({ field: 'username', message: 'Username is required' });
    } else if (typeof user.username !== 'string') {
      errors.push({ field: 'username', message: 'Username must be a string' });
    }

    if (!user.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (typeof user.email !== 'string') {
      errors.push({ field: 'email', message: 'Email must be a string' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push({ field: 'email', message: 'Email is not valid' });
    }

    if (user.tags && typeof user.tags !== 'object') {
      errors.push({ field: 'tags', message: 'Tags must be an object' });
    }

    return errors;
  }

  static validateRole(role: Partial<Role>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!role.name) {
      errors.push({ field: 'name', message: 'Role name is required' });
    } else if (typeof role.name !== 'string') {
      errors.push({ field: 'name', message: 'Role name must be a string' });
    }

    if (role.description && typeof role.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    }

    if (role.tags && typeof role.tags !== 'object') {
      errors.push({ field: 'tags', message: 'Tags must be an object' });
    }

    return errors;
  }

  static validateTag(tag: unknown): ValidationError | null {
    if (typeof tag !== 'object' || tag === null) {
      return { field: 'tags', message: 'Tags must be a non-null object' };
    }

    for (const [key, value] of Object.entries(tag)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return { 
          field: `tags.${key}`, 
          message: 'Tag values must be string, number, or boolean' 
        };
      }
    }

    return null;
  }

  static validateId(id: string): ValidationError | null {
    if (!id) {
      return { field: 'id', message: 'ID is required' };
    }

    if (typeof id !== 'string') {
      return { field: 'id', message: 'ID must be a string' };
    }

    return null;
  }

  static validateQueryOptions(options: unknown): ValidationError | null {
    if (options && typeof options !== 'object') {
      return { field: 'options', message: 'Query options must be an object' };
    }

    return null;
  }
}
