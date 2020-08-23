import { Nullable } from 'frl-ts-utils/lib/types';

export class VariableValidatorState
{
    public static CreateEmpty(): VariableValidatorState {
        return new VariableValidatorState(null, null);
    }

    public static CreateErrors(errors: ReadonlyArray<string>): VariableValidatorState {
        return new VariableValidatorState(errors, null);
    }

    public static CreateWarnings(warnings: ReadonlyArray<string>): VariableValidatorState {
        return new VariableValidatorState(null, warnings);
    }

    public readonly errors: Nullable<ReadonlyArray<string>>;
    public readonly warnings: Nullable<ReadonlyArray<string>>;

    public constructor(errors: Nullable<ReadonlyArray<string>>, warnings: Nullable<ReadonlyArray<string>>)
    {
        this.errors = errors;
        this.warnings = warnings;
    }
}
