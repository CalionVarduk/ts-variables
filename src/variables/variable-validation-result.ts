import { Nullable } from 'frl-ts-utils/lib/types';

export class VariableValidationResult
{
    public static CreateEmpty(): VariableValidationResult {
        return new VariableValidationResult(null, null);
    }

    public static CreateErrors(...errors: string[]): VariableValidationResult {
        return new VariableValidationResult(errors, null);
    }

    public static CreateWarnings(...warnings: string[]): VariableValidationResult {
        return new VariableValidationResult(null, warnings);
    }

    public readonly errors: Nullable<ReadonlyArray<string>>;
    public readonly warnings: Nullable<ReadonlyArray<string>>;

    public constructor(errors: Nullable<ReadonlyArray<string>>, warnings: Nullable<ReadonlyArray<string>>)
    {
        this.errors = errors;
        this.warnings = warnings;
    }
}
