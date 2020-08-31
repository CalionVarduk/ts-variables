import { Nullable } from 'frl-ts-utils/lib/types';
import { isNull } from 'frl-ts-utils/lib/functions';

export class VariableValidationResult
{
    public static CreateEmpty(): VariableValidationResult
    {
        return new VariableValidationResult(null, null);
    }

    public static CreateErrors(...errors: string[]): VariableValidationResult
    {
        return new VariableValidationResult(errors, null);
    }

    public static CreateWarnings(...warnings: string[]): VariableValidationResult
    {
        return new VariableValidationResult(null, warnings);
    }

    public static Combine(results: Iterable<VariableValidationResult>): Nullable<VariableValidationResult>
    {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const result of results)
        {
            if (!isNull(result.errors))
                errors.push(...result.errors);
            if (!isNull(result.warnings))
                warnings.push(...result.warnings);
        }

        if (errors.length === 0)
            return warnings.length === 0 ? null : new VariableValidationResult(null, warnings);

        return warnings.length === 0 ?
            new VariableValidationResult(errors, null) :
            new VariableValidationResult(errors, warnings);
    }

    public readonly errors: Nullable<ReadonlyArray<string>>;
    public readonly warnings: Nullable<ReadonlyArray<string>>;

    public constructor(errors: Nullable<ReadonlyArray<string>>, warnings: Nullable<ReadonlyArray<string>>)
    {
        this.errors = errors;
        this.warnings = warnings;
    }
}
