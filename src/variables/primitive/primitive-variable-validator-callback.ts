import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidationResult } from '../variable-validation-result';

export type PrimitiveVariableValidatorCallback<T> =
    (value: Nullable<DeepReadonly<T>>) => Nullable<VariableValidationResult>;
