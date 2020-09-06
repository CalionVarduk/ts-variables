import { Nullable } from 'frl-ts-utils/lib/types';
import { VariableValidationResult } from './variable-validation-result';

export type VariableValidatorCallback<T> =
    (value: T) => Nullable<VariableValidationResult>;
