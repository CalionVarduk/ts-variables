import { Nullable } from 'frl-ts-utils/lib/types';
import { VariableValidationResult } from './variable-validation-result';

export type VariableValidatorAsyncCallback<T> =
    (value: T) => Promise<Nullable<VariableValidationResult>>;
