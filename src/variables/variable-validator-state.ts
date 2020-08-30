import { Nullable } from 'frl-ts-utils/lib/types';

export abstract class VariableValidatorState
{
    public abstract get errors(): Nullable<ReadonlyArray<string>>;
    public abstract get warnings(): Nullable<ReadonlyArray<string>>;

    protected constructor() {}
}
