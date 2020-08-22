import { Nullable } from 'frl-ts-utils/lib/types';

export interface IVariableValidatorState
{
    readonly errors: Nullable<ReadonlyArray<string>>;
    readonly warnings: Nullable<ReadonlyArray<string>>;
}
