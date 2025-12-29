import { ParameterDefinition } from '../types';
import { Image } from '@/domain/models/Image';

/**
 * Parameter definition for image inputs
 */
export interface ImageParameterDefinition
  extends ParameterDefinition<Image | null> {
  type: 'image';
  accept?: string; // File input accept attribute
}

/**
 * Create an image parameter definition
 */
export function createImageParameter(
  label: string,
  accept?: string
): ImageParameterDefinition {
  return {
    type: 'image',
    label,
    defaultValue: null,
    accept: accept ?? 'image/*',
    validate: (value) => value === null || value instanceof Image,
  };
}
