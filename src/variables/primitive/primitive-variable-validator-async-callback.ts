import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidationResult } from '../variable-validation-result';

export type PrimitiveVariableValidatorAsyncCallback<T> =
    (value: Nullable<DeepReadonly<T>>) => Promise<Nullable<VariableValidationResult>>;
