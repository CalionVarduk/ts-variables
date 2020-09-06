import { Nullable, DeepReadonly, Ensured, Stringifier } from 'frl-ts-utils/lib/types';
import { isDefined, isNull, isUndefined, reinterpretCast } from 'frl-ts-utils/lib/functions';
import { Iteration, UnorderedSet, IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { VariableValidationResult } from './variable-validation-result';
import { VariableValidatorCallback } from './variable-validator-callback';
import { VariableValidatorAsyncCallback } from './variable-validator-async-callback';
import { IVariable } from './variable.interface';

function concatMessages(state: VariableValidationResult): Nullable<ReadonlyArray<string>>
{
    const messages: string[] = isNull(state.warnings) ? [] : [...state.warnings];
    if (!isNull(state.errors))
        messages.push(...state.errors);

    return messages.length > 0 ? messages : null;
}

export namespace Validation
{
    export const NOT_SYNCHRONIZED = 'NOT_SYNCHRONIZED';
    export const NOT_EMPTY = 'NOT_EMPTY';
    export const EMPTY = 'EMPTY';
    export const LENGTH_LESS_THAN = 'LENGTH_LESS_THAN';
    export const LENGTH_GREATER_THAN = 'LENGTH_GREATER_THAN';
    export const LENGTH_NOT_BETWEEN = 'LENGTH_NOT_BETWEEN';
    export const LENGTH_BETWEEN = 'LENGTH_BETWEEN';

    export function Sync<T>(other: IVariable<T>, syncName?: string): VariableValidatorCallback<T>
    {
        const errorMsg = isDefined(syncName) ?
            `${syncName}_${NOT_SYNCHRONIZED}` :
            NOT_SYNCHRONIZED;

        return value =>
        {
            if (other.changeTracker.areEqual(value, other.value))
                return null;

            return VariableValidationResult.CreateErrors(errorMsg);
        };
    }

    export function AsWarnings<T = any>(delegate: VariableValidatorCallback<T>): VariableValidatorCallback<T>
    {
        return value =>
        {
            const result = delegate(value);
            return isNull(result) ?
                null :
                new VariableValidationResult(null, concatMessages(result));
        };
    }

    export function AsWarningsAsync<T = any>(delegate: VariableValidatorAsyncCallback<T>): VariableValidatorAsyncCallback<T>
    {
        return async value =>
        {
            const result = await delegate(value);
            return isNull(result) ?
                null :
                new VariableValidationResult(null, concatMessages(result));
        };
    }

    export function AsErrors<T = any>(delegate: VariableValidatorCallback<T>): VariableValidatorCallback<T>
    {
        return value =>
        {
            const result = delegate(value);
            return isNull(result) ?
                null :
                new VariableValidationResult(concatMessages(result), null);
        };
    }

    export function AsErrorsAsync<T = any>(delegate: VariableValidatorAsyncCallback<T>): VariableValidatorAsyncCallback<T>
    {
        return async value =>
        {
            const result = await delegate(value);
            return isNull(result) ?
                null :
                new VariableValidationResult(concatMessages(result), null);
        };
    }

    export function And<T>(...delegates: VariableValidatorCallback<T>[]): VariableValidatorCallback<T>
    {
        if (!isDefined(delegates) || delegates.length === 0)
            return () => null;

        if (delegates.length === 1)
            return delegates[0];

        return value =>
        {
            const resultRange = Iteration.FilterNotNull(
                Iteration.Map(
                    delegates,
                    d => d(value)));

            return VariableValidationResult.Combine(resultRange);
        };
    }

    export function AndAsync<T>(
        ...delegates: VariableValidatorAsyncCallback<T>[]):
        VariableValidatorAsyncCallback<T>
    {
        if (!isDefined(delegates) || delegates.length === 0)
            return () => Promise.resolve(null);

        if (delegates.length === 1)
            return delegates[0];

        return async value =>
        {
            const resultRange = Iteration.FilterNotNull(
                await Promise.all(
                    Iteration.Map(
                        delegates,
                        d => d(value))));

            return VariableValidationResult.Combine(resultRange);
        };
    }

    export function Or<T>(...delegates: VariableValidatorCallback<T>[]): VariableValidatorCallback<T>
    {
        if (!isDefined(delegates) || delegates.length === 0)
            return () => null;

        if (delegates.length === 1)
            return delegates[0];

        return value =>
        {
            const invalidResultRange: VariableValidationResult[] = [];

            for (const d of delegates)
            {
                const result = d(value);
                if (isNull(result))
                    return null;

                if ((isNull(result.errors) || result.errors.length === 0) &&
                    (isNull(result.warnings) || result.warnings.length === 0))
                    return null;

                invalidResultRange.push(result);
            }

            return VariableValidationResult.Combine(invalidResultRange);
        };
    }

    export function OrAsync<T>(
        ...delegates: VariableValidatorAsyncCallback<T>[]):
        VariableValidatorAsyncCallback<T>
    {
        if (!isDefined(delegates) || delegates.length === 0)
            return () => Promise.resolve(null);

        if (delegates.length === 1)
            return delegates[0];

        return async value =>
        {
            const resultRange = await Promise.all(
                Iteration.Map(
                    delegates,
                    d => d(value)));

            const invalidResultRange: VariableValidationResult[] = [];

            for (const result of resultRange)
            {
                if (isNull(result))
                    return null;

                if ((isNull(result.errors) || result.errors.length === 0) &&
                    (isNull(result.warnings) || result.warnings.length === 0))
                    return null;

                invalidResultRange.push(result);
            }

            return VariableValidationResult.Combine(invalidResultRange);
        };
    }

    export function OrSequentialAsync<T>(
        ...delegates: VariableValidatorAsyncCallback<T>[]):
        VariableValidatorAsyncCallback<T>
    {
        if (!isDefined(delegates) || delegates.length === 0)
            return () => Promise.resolve(null);

        if (delegates.length === 1)
            return delegates[0];

        return async value =>
        {
            const invalidResultRange: VariableValidationResult[] = [];

            for (const d of delegates)
            {
                const result = await d(value);
                if (isNull(result))
                    return null;

                if ((isNull(result.errors) || result.errors.length === 0) &&
                    (isNull(result.warnings) || result.warnings.length === 0))
                    return null;

                invalidResultRange.push(result);
            }

            return VariableValidationResult.Combine(invalidResultRange);
        };
    }

    export function Not<T>(
        delegate: VariableValidatorCallback<T>,
        stateFactory: () => VariableValidationResult):
        VariableValidatorCallback<T>
    {
        return value =>
        {
            const result = delegate(value);
            if (isNull(result))
                return stateFactory();

            if ((isNull(result.errors) || result.errors.length === 0) &&
                (isNull(result.warnings) || result.warnings.length === 0))
                return stateFactory();

            return null;
        };
    }

    export function NotAsync<T>(
        delegate: VariableValidatorAsyncCallback<T>,
        stateFactory: () => VariableValidationResult):
        VariableValidatorAsyncCallback<T>
    {
        return async value =>
        {
            const result = await delegate(value);
            if (isNull(result))
                return stateFactory();

            if ((isNull(result.errors) || result.errors.length === 0) &&
                (isNull(result.warnings) || result.warnings.length === 0))
                return stateFactory();

            return null;
        };
    }

    export namespace Primitive
    {
        export const REQUIRED = 'REQUIRED';
        export const NOT_EQUAL_TO_NULL = 'NOT_EQUAL_TO_NULL';
        export const NOT_EQUAL_TO_UNDEFINED = 'NOT_EQUAL_TO_UNDEFINED';
        export const NOT_EQUAL_TO = 'NOT_EQUAL_TO';
        export const EQUAL_TO_NULL = 'EQUAL_TO_NULL';
        export const EQUAL_TO_UNDEFINED = 'EQUAL_TO_UNDEFINED';
        export const EQUAL_TO = 'EQUAL_TO';
        export const NOT_GREATER_THAN = 'NOT_GREATER_THAN';
        export const NOT_LESS_THAN = 'NOT_LESS_THAN';
        export const NOT_GREATER_THAN_OR_EQUAL_TO = 'NOT_GREATER_THAN_OR_EQUAL_TO';
        export const NOT_LESS_THAN_OR_EQUAL_TO = 'NOT_LESS_THAN_OR_EQUAL_TO';
        export const NOT_BETWEEN = 'NOT_BETWEEN';
        export const BETWEEN = 'BETWEEN';
        export const NOT_IN = 'NOT_IN';
        export const NOT_IN_SET = 'NOT_IN_SET';
        export const IN = 'IN';
        export const IN_SET = 'IN_SET';
        export const PATTERN_NOT_MATCHED = 'PATTERN_NOT_MATCHED';
        export const PATTERN_MATCHED = 'PATTERN_MATCHED';
        export const NOT_INTEGER = 'NOT_INTEGER';

        export function Required<T = any>(): VariableValidatorCallback<Nullable<DeepReadonly<T>>>
        {
            return value =>
            {
                if (isDefined(value))
                    return null;

                return VariableValidationResult.CreateErrors(REQUIRED);
            };
        }

        export namespace Number
        {
            export function EqualTo(obj: Nullable<number>): VariableValidatorCallback<Nullable<number>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<number>): VariableValidatorCallback<Nullable<number>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function GreaterThan(obj: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${NOT_GREATER_THAN}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value > obj)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LessThan(obj: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${NOT_LESS_THAN}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value < obj)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function GreaterThanOrEqualTo(obj: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${NOT_GREATER_THAN_OR_EQUAL_TO}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value >= obj)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LessThanOrEqualTo(obj: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${NOT_LESS_THAN_OR_EQUAL_TO}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value <= obj)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function Between(min: number, max: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${NOT_BETWEEN}_${min.toString().toUpperCase()}_${max.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || (value >= min && value <= max))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotBetween(min: number, max: number): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = `${BETWEEN}_${min.toString().toUpperCase()}_${max.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value < min || value > max)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function In(set: ReadonlyArray<number>, setName?: string): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<number>(set);

                return value =>
                {
                    if (isNull(value) || test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotIn(set: ReadonlyArray<number>, setName?: string): VariableValidatorCallback<Nullable<number>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<number>(set);

                return value =>
                {
                    if (isNull(value) || !test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function Integer(): VariableValidatorCallback<Nullable<number>>
            {
                return value =>
                {
                    if (isNull(value) || Math.trunc(value) === value)
                        return null;

                    return VariableValidationResult.CreateErrors(NOT_INTEGER);
                };
            }
        }

        export namespace String
        {
            export function EqualTo(obj: Nullable<string>): VariableValidatorCallback<Nullable<string>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<string>): VariableValidatorCallback<Nullable<string>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function In(set: ReadonlyArray<string>, setName?: string): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<string>(set);

                return value =>
                {
                    if (isNull(value) || test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotIn(set: ReadonlyArray<string>, setName?: string): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<string>(set);

                return value =>
                {
                    if (isNull(value) || !test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function Empty(): VariableValidatorCallback<Nullable<string>>
            {
                return value =>
                {
                    if (isNull(value) || value.length === 0)
                        return null;

                    return VariableValidationResult.CreateErrors(NOT_EMPTY);
                };
            }

            export function NotEmpty(): VariableValidatorCallback<Nullable<string>>
            {
                return value =>
                {
                    if (isNull(value) || value.length > 0)
                        return null;

                    return VariableValidationResult.CreateErrors(EMPTY);
                };
            }

            export function MinLength(length: number): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = `${LENGTH_LESS_THAN}_${length.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length >= length)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function MaxLength(length: number): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = `${LENGTH_GREATER_THAN}_${length.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length <= length)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LengthBetween(minLength: number, maxLength: number): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = `${LENGTH_NOT_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || (value.length >= minLength && value.length <= maxLength))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LengthNotBetween(minLength: number, maxLength: number): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = `${LENGTH_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length < minLength || value.length > maxLength)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function Matches(regexp: string | RegExp, patternName?: string): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = isDefined(patternName) && patternName.length > 0 ?
                    `${patternName}_${PATTERN_NOT_MATCHED}` :
                    PATTERN_NOT_MATCHED;

                return value =>
                {
                    if (isNull(value))
                        return null;

                    const matchResult = value.match(regexp);
                    if (isDefined(matchResult) && matchResult.length > 0)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotMatches(regexp: string | RegExp, patternName?: string): VariableValidatorCallback<Nullable<string>>
            {
                const errorMsg = isDefined(patternName) && patternName.length > 0 ?
                    `${patternName}_${PATTERN_MATCHED}` :
                    PATTERN_MATCHED;

                return value =>
                {
                    if (isNull(value))
                        return null;

                    const matchResult = value.match(regexp);
                    if (isDefined(matchResult) && matchResult.length > 0)
                        return VariableValidationResult.CreateErrors(errorMsg);

                    return null;
                };
            }
        }

        export namespace Bool
        {
            export function EqualTo(obj: Nullable<boolean>): VariableValidatorCallback<Nullable<boolean>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<boolean>): VariableValidatorCallback<Nullable<boolean>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }
        }

        export namespace Date
        {
            export function EqualTo(obj: Nullable<Readonly<Date>>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();
                return value =>
                {
                    if (isNull(value) || objValueOf === value.valueOf())
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<Readonly<Date>>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();
                return value =>
                {
                    if (isNull(value) || objValueOf !== value.valueOf())
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function GreaterThan(obj: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${NOT_GREATER_THAN}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() > objValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LessThan(obj: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${NOT_LESS_THAN}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() < objValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function GreaterThanOrEqualTo(obj: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${NOT_GREATER_THAN_OR_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() >= objValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function LessThanOrEqualTo(obj: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${NOT_LESS_THAN_OR_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() <= objValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function Between(min: Readonly<Date>, max: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${NOT_BETWEEN}_${min.toISOString()}_${max.toISOString()}`;
                const minValueOf = min.valueOf();
                const maxValueOf = max.valueOf();

                return value =>
                {
                    if (isNull(value))
                        return null;

                    const valueOf = value.valueOf();
                    if (valueOf >= minValueOf && valueOf <= maxValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotBetween(min: Readonly<Date>, max: Readonly<Date>): VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = `${BETWEEN}_${min.toString().toUpperCase()}_${max.toString().toUpperCase()}`;
                const minValueOf = min.valueOf();
                const maxValueOf = max.valueOf();

                return value =>
                {
                    if (isNull(value))
                        return null;

                    const valueOf = value.valueOf();
                    if (valueOf < minValueOf || valueOf > maxValueOf)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function In(
                set: ReadonlyArray<Readonly<Date>>,
                setName?: string):
                VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<number>(set.map(d => d.valueOf()));

                return value =>
                {
                    if (isNull(value) || test.has(value.valueOf()))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotIn(
                set: ReadonlyArray<Readonly<Date>>,
                setName?: string):
                VariableValidatorCallback<Nullable<DeepReadonly<Date>>>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<number>(set.map(d => d.valueOf()));

                return value =>
                {
                    if (isNull(value) || !test.has(value.valueOf()))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }
        }

        export namespace Object
        {
            export function EqualTo<T>(
                obj: Nullable<DeepReadonly<T>>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    comparer?(left: Ensured<DeepReadonly<T>>, right: Ensured<DeepReadonly<T>>): boolean;
                }):
                VariableValidatorCallback<Nullable<DeepReadonly<T>>>
            {
                if (!isDefined(params))
                    params = {};

                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }
                if (isUndefined(obj))
                {
                    return value =>
                    {
                        if (isUndefined(value))
                            return null;

                        return VariableValidationResult.CreateErrors(NOT_EQUAL_TO_UNDEFINED);
                    };
                }
                const errorMsg =
                    `${NOT_EQUAL_TO}_${isDefined(params.stringifier) ? params.stringifier(obj) : obj.toString().toUpperCase()}`;
                const comparer = params.comparer;

                if (isDefined(comparer))
                {
                    return value =>
                    {
                        if (isNull(value) || obj === value || (isDefined(value) && comparer(obj!, value!)))
                            return null;

                        return VariableValidationResult.CreateErrors(errorMsg);
                    };
                }
                return value =>
                {
                    if (obj === value)
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo<T>(
                obj: Nullable<DeepReadonly<T>>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    comparer?(left: Ensured<DeepReadonly<T>>, right: Ensured<DeepReadonly<T>>): boolean;
                }):
                VariableValidatorCallback<Nullable<DeepReadonly<T>>>
            {
                if (!isDefined(params))
                    params = {};

                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }
                if (isUndefined(obj))
                {
                    return value =>
                    {
                        if (isUndefined(value))
                            return VariableValidationResult.CreateErrors(EQUAL_TO_UNDEFINED);

                        return null;
                    };
                }
                const errorMsg = `${EQUAL_TO}_${isDefined(params.stringifier) ? params.stringifier(obj) : obj.toString().toUpperCase()}`;
                const comparer = params.comparer;

                if (isDefined(comparer))
                {
                    return value =>
                    {
                        if (obj === value || (isDefined(value) && comparer(obj!, value!)))
                            return VariableValidationResult.CreateErrors(errorMsg);

                        return null;
                    };
                }
                return value =>
                {
                    if (obj === value)
                        return VariableValidationResult.CreateErrors(errorMsg);

                    return null;
                };
            }

            export function In<T>(
                set: ReadonlyArray<T>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    readonly setName?: string;
                }):
                VariableValidatorCallback<Nullable<DeepReadonly<T>>>
            {
                if (!isDefined(params))
                    params = {};

                const errorMsg = isDefined(params.setName) && params.setName.length > 0 ?
                    `${NOT_IN}_${params.setName}` :
                    NOT_IN_SET;

                const test = new UnorderedSet<T>(params.stringifier);
                set.forEach(t => test.tryAdd(t));

                return value =>
                {
                    if (isNull(value) || test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }

            export function NotIn<T>(
                set: ReadonlyArray<T>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    readonly setName?: string;
                }):
                VariableValidatorCallback<Nullable<DeepReadonly<T>>>
            {
                if (!isDefined(params))
                    params = {};

                const errorMsg = isDefined(params.setName) && params.setName.length > 0 ?
                    `${IN}_${params.setName}` :
                    IN_SET;

                const test = new UnorderedSet<T>(params.stringifier);
                set.forEach(t => test.tryAdd(t));

                return value =>
                {
                    if (isNull(value) || !test.has(value))
                        return null;

                    return VariableValidationResult.CreateErrors(errorMsg);
                };
            }
        }
    }

    export namespace Collection
    {
        export const NOT_CONTAINS = 'NOT_CONTAINS';
        export const CONTAINS = 'CONTAINS';

        export function Empty<TKey, TElement>(): VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            return value =>
            {
                if (value.length === 0)
                    return null;

                return VariableValidationResult.CreateErrors(NOT_EMPTY);
            };
        }

        export function NotEmpty<TKey, TElement>(): VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            return value =>
            {
                if (value.length > 0)
                    return null;

                return VariableValidationResult.CreateErrors(EMPTY);
            };
        }

        export function MinLength<TKey, TElement>(
            length: number):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const errorMsg = `${LENGTH_LESS_THAN}_${length.toString().toUpperCase()}`;

            return value =>
            {
                if (value.length >= length)
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function MaxLength<TKey, TElement>(
            length: number):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const errorMsg = `${LENGTH_GREATER_THAN}_${length.toString().toUpperCase()}`;

            return value =>
            {
                if (value.length <= length)
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function LengthBetween<TKey, TElement>(
            minLength: number,
            maxLength: number):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const errorMsg = `${LENGTH_NOT_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

            return value =>
            {
                if (value.length >= minLength && value.length <= maxLength)
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function LengthNotBetween<TKey, TElement>(
            minLength: number,
            maxLength: number):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const errorMsg = `${LENGTH_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

            return value =>
            {
                if (value.length < minLength || value.length > maxLength)
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function ContainsKey<TKey, TElement>(
            key: DeepReadonly<TKey>,
            keyName?: string):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const name = isDefined(keyName) ? keyName : reinterpretCast<Object>(key).toString();
            const errorMsg = `${NOT_CONTAINS}_${name.toUpperCase()}`;

            return value =>
            {
                if (value.hasKey(key))
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function NotContainsKey<TKey, TElement>(
            key: DeepReadonly<TKey>,
            keyName?: string):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const name = isDefined(keyName) ? keyName : reinterpretCast<Object>(key).toString();
            const errorMsg = `${CONTAINS}_${name.toUpperCase()}`;

            return value =>
            {
                if (!value.hasKey(key))
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function ContainsLookupKey<TKey, TElement, TLookupKey>(
            lookupName: string,
            key: DeepReadonly<TLookupKey>,
            keyName?: string):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const name = isDefined(keyName) ? keyName : reinterpretCast<Object>(key).toString();
            const errorMsg = `${NOT_CONTAINS}_${name.toUpperCase()}`;

            return value =>
            {
                const lookup = value.getLookup<TLookupKey>(lookupName);
                if (lookup.hasKey(key))
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }

        export function NotContainsLookupKey<TKey, TElement, TLookupKey>(
            lookupName: string,
            key: DeepReadonly<TLookupKey>,
            keyName?: string):
            VariableValidatorCallback<IReadonlyKeyedCollection<TKey, TElement>>
        {
            const name = isDefined(keyName) ? keyName : reinterpretCast<Object>(key).toString();
            const errorMsg = `${CONTAINS}_${name.toUpperCase()}`;

            return value =>
            {
                const lookup = value.getLookup<TLookupKey>(lookupName);
                if (!lookup.hasKey(key))
                    return null;

                return VariableValidationResult.CreateErrors(errorMsg);
            };
        }
    }
}
