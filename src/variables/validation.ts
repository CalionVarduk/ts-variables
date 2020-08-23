import { Nullable, DeepReadonly, Ensured, Stringifier } from 'frl-ts-utils/lib/types';
import { isDefined, isNull, isUndefined, isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { Iteration, UnorderedSet } from 'frl-ts-utils/lib/collections';
import { PrimitiveVariableValidatorCallback } from './primitive/primitive-variable-validator-callback';
import { VariableValidatorState } from './variable-validator-state';

function combineStates(states: Iterable<VariableValidatorState>): Nullable<VariableValidatorState>
{
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const state of states)
    {
        if (!isNull(state.errors))
            errors.push(...state.errors);

        if (!isNull(state.warnings))
            warnings.push(...state.warnings);
    }

    if (errors.length === 0 && warnings.length === 0)
        return null;

    return new VariableValidatorState(
        errors.length > 0 ? errors : null,
        warnings.length > 0 ? warnings : null);
}

function concatMessages(state: VariableValidatorState): Nullable<ReadonlyArray<string>>
{
    const warnings: string[] = isNull(state.warnings) ? [] : [...state.warnings];
    if (!isNull(state.errors))
        warnings.push(...state.errors);

    return warnings.length > 0 ? warnings : null;
}

export namespace Validation
{
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
        export const NOT_EMPTY = 'NOT_EMPTY';
        export const EMPTY = 'EMPTY';
        export const LENGTH_LESS_THAN = 'LENGTH_LESS_THAN';
        export const LENGTH_GREATER_THAN = 'LENGTH_GREATER_THAN';
        export const LENGTH_NOT_BETWEEN = 'LENGTH_NOT_BETWEEN';
        export const LENGTH_BETWEEN = 'LENGTH_BETWEEN';
        export const PATTERN_NOT_MATCHED = 'PATTERN_NOT_MATCHED';
        export const PATTERN_MATCHED = 'PATTERN_MATCHED';

        export function Required<T = any>(): PrimitiveVariableValidatorCallback<T>
        {
            return value =>
            {
                if (isDefined(value))
                    return null;

                return VariableValidatorState.CreateErrors(REQUIRED);
            };
        }

        export function AsWarnings<T = any>(delegate: PrimitiveVariableValidatorCallback<T>): PrimitiveVariableValidatorCallback<T>
        {
            return value =>
            {
                const result = delegate(value);
                if (isNull(result))
                    return null;

                if (isInstanceOfType(VariableValidatorState, result))
                    return new VariableValidatorState(
                        null,
                        concatMessages(result));

                return result.then(asyncResult =>
                    {
                        if (isNull(asyncResult))
                            return null;

                        return new VariableValidatorState(
                            null,
                            concatMessages(asyncResult));
                    });
            };
        }

        export function AsErrors<T = any>(delegate: PrimitiveVariableValidatorCallback<T>): PrimitiveVariableValidatorCallback<T>
        {
            return value =>
            {
                const result = delegate(value);
                if (isNull(result))
                    return null;

                if (isInstanceOfType(VariableValidatorState, result))
                    return new VariableValidatorState(
                        concatMessages(result),
                        null);

                return result.then(asyncResult =>
                    {
                        if (isNull(asyncResult))
                            return null;

                        return new VariableValidatorState(
                            concatMessages(asyncResult),
                            null);
                    });
            };
        }

        export function And<T>(...delegates: PrimitiveVariableValidatorCallback<T>[]): PrimitiveVariableValidatorCallback<T>
        {
            if (!isDefined(delegates) || delegates.length === 0)
                return () => null;

            if (delegates.length === 1)
                return delegates[0];

            return value =>
            {
                const resultRange = Iteration.ToArray(
                    Iteration.FilterNotNull(
                        Iteration.Map(
                            delegates,
                            d => d(value))));

                const syncResultRange = Iteration.ToArray(
                    Iteration.OfType(resultRange, VariableValidatorState));

                const promiseRange = Iteration.ToArray(
                    Iteration.ReinterpretCast<Promise<Nullable<VariableValidatorState>>>(
                        Iteration.Filter(
                            resultRange,
                            r => !isInstanceOfType(VariableValidatorState, r))));

                if (promiseRange.length === 0)
                {
                    if (syncResultRange.length === 0)
                        return null;

                    return combineStates(syncResultRange);
                }
                return Promise.all(promiseRange)
                    .then(asyncNullableResultRange =>
                        {
                            const states = Iteration.Concat(
                                syncResultRange,
                                Iteration.FilterNotNull(asyncNullableResultRange));

                            return combineStates(states);
                        });
            };
        }

        export function Or<T>(...delegates: PrimitiveVariableValidatorCallback<T>[]): PrimitiveVariableValidatorCallback<T>
        {
            if (!isDefined(delegates) || delegates.length === 0)
                return () => null;

            if (delegates.length === 1)
                return delegates[0];

            return value =>
            {
                const invalidStateRange: VariableValidatorState[] = [];
                const promiseRange: Promise<Nullable<VariableValidatorState>>[] = [];

                for (const d of delegates)
                {
                    const result = d(value);
                    if (isNull(result))
                        return null;

                    if (isInstanceOfType(VariableValidatorState, result))
                    {
                        if ((isNull(result.errors) || result.errors.length === 0) &&
                            (isNull(result.warnings) || result.warnings.length === 0))
                            return null;

                        invalidStateRange.push(result);
                    }
                    else
                        promiseRange.push(result);
                }

                if (promiseRange.length === 0)
                {
                    if (invalidStateRange.length === 0)
                        return null;

                    return combineStates(invalidStateRange);
                }
                return Promise.all(promiseRange)
                    .then(asyncNullableResultRange =>
                        {
                            for (const result of asyncNullableResultRange)
                            {
                                if (isNull(result) ||
                                    ((isNull(result.errors) || result.errors.length === 0) &&
                                    (isNull(result.warnings) || result.warnings.length === 0)))
                                    return null;

                                invalidStateRange.push(result);
                            }

                            return combineStates(invalidStateRange);
                        });
            };
        }

        export function Not<T>(
            delegate: PrimitiveVariableValidatorCallback<T>,
            stateFactory: () => VariableValidatorState):
            PrimitiveVariableValidatorCallback<T>
        {
            return value =>
            {
                const result = delegate(value);
                if (isNull(result))
                    return stateFactory();

                if (isInstanceOfType(VariableValidatorState, result))
                {
                    if ((isNull(result.errors) || result.errors.length === 0) &&
                        (isNull(result.warnings) || result.warnings.length === 0))
                        return stateFactory();

                    return null;
                }

                return result.then(asyncResult =>
                    {
                        if (isNull(asyncResult) ||
                            ((isNull(asyncResult.errors) || asyncResult.errors.length === 0) &&
                            (isNull(asyncResult.warnings) || asyncResult.warnings.length === 0)))
                            return stateFactory();

                        return null;
                    });
            };
        }

        export namespace Number
        {
            export function EqualTo(obj: Nullable<number>): PrimitiveVariableValidatorCallback<number>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<number>): PrimitiveVariableValidatorCallback<number>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function GreaterThan(obj: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${NOT_GREATER_THAN}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value > obj)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LessThan(obj: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${NOT_LESS_THAN}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value < obj)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function GreaterThanOrEqualTo(obj: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${NOT_GREATER_THAN_OR_EQUAL_TO}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value >= obj)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LessThanOrEqualTo(obj: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${NOT_LESS_THAN_OR_EQUAL_TO}_${obj.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value <= obj)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function Between(min: number, max: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${NOT_BETWEEN}_${min.toString().toUpperCase()}_${max.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || (value >= min && value <= max))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotBetween(min: number, max: number): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = `${BETWEEN}_${min.toString().toUpperCase()}_${max.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value < min || value > max)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function In(set: ReadonlyArray<number>, setName?: string): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<number>(set);

                return value =>
                {
                    if (isNull(value) || test.has(value))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotIn(set: ReadonlyArray<number>, setName?: string): PrimitiveVariableValidatorCallback<number>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<number>(set);

                return value =>
                {
                    if (isNull(value) || !test.has(value))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }
        }

        export namespace String
        {
            export function EqualTo(obj: Nullable<string>): PrimitiveVariableValidatorCallback<string>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<string>): PrimitiveVariableValidatorCallback<string>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function In(set: ReadonlyArray<string>, setName?: string): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<string>(set);

                return value =>
                {
                    if (isNull(value) || test.has(value))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotIn(set: ReadonlyArray<string>, setName?: string): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<string>(set);

                return value =>
                {
                    if (isNull(value) || !test.has(value))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function Empty(): PrimitiveVariableValidatorCallback<string>
            {
                return value =>
                {
                    if (isNull(value) || value.length === 0)
                        return null;

                    return VariableValidatorState.CreateErrors(NOT_EMPTY);
                };
            }

            export function NotEmpty(): PrimitiveVariableValidatorCallback<string>
            {
                return value =>
                {
                    if (isNull(value) || value.length > 0)
                        return null;

                    return VariableValidatorState.CreateErrors(EMPTY);
                };
            }

            export function MinLength(length: number): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = `${LENGTH_LESS_THAN}_${length.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length >= length)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function MaxLength(length: number): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = `${LENGTH_GREATER_THAN}_${length.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length <= length)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LengthBetween(minLength: number, maxLength: number): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = `${LENGTH_NOT_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || (value.length >= minLength && value.length <= maxLength))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LengthNotBetween(minLength: number, maxLength: number): PrimitiveVariableValidatorCallback<string>
            {
                const errorMsg = `${LENGTH_BETWEEN}_${minLength.toString().toUpperCase()}_${maxLength.toString().toUpperCase()}`;

                return value =>
                {
                    if (isNull(value) || value.length < minLength || value.length > maxLength)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function Matches(regexp: string | RegExp, patternName?: string): PrimitiveVariableValidatorCallback<string>
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

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotMatches(regexp: string | RegExp, patternName?: string): PrimitiveVariableValidatorCallback<string>
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
                        return VariableValidatorState.CreateErrors(errorMsg);

                    return null;
                };
            }
        }

        export namespace Bool
        {
            export function EqualTo(obj: Nullable<boolean>): PrimitiveVariableValidatorCallback<boolean>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj === value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<boolean>): PrimitiveVariableValidatorCallback<boolean>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toString().toUpperCase()}`;
                return value =>
                {
                    if (isNull(value) || obj !== value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }
        }

        export namespace Date
        {
            export function EqualTo(obj: Nullable<Readonly<Date>>): PrimitiveVariableValidatorCallback<Date>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }

                const errorMsg = `${NOT_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();
                return value =>
                {
                    if (isNull(value) || objValueOf === value.valueOf())
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo(obj: Nullable<Readonly<Date>>): PrimitiveVariableValidatorCallback<Date>
            {
                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }

                const errorMsg = `${EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();
                return value =>
                {
                    if (isNull(value) || objValueOf !== value.valueOf())
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function GreaterThan(obj: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = `${NOT_GREATER_THAN}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() > objValueOf)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LessThan(obj: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = `${NOT_LESS_THAN}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() < objValueOf)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function GreaterThanOrEqualTo(obj: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = `${NOT_GREATER_THAN_OR_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() >= objValueOf)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function LessThanOrEqualTo(obj: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = `${NOT_LESS_THAN_OR_EQUAL_TO}_${obj.toISOString()}`;
                const objValueOf = obj.valueOf();

                return value =>
                {
                    if (isNull(value) || value.valueOf() <= objValueOf)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function Between(min: Readonly<Date>, max: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
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

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotBetween(min: Readonly<Date>, max: Readonly<Date>): PrimitiveVariableValidatorCallback<Date>
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

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function In(set: ReadonlyArray<Readonly<Date>>, setName?: string): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${NOT_IN}_${setName}` :
                    NOT_IN_SET;

                const test = new Set<number>(set.map(d => d.valueOf()));

                return value =>
                {
                    if (isNull(value) || test.has(value.valueOf()))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotIn(set: ReadonlyArray<Readonly<Date>>, setName?: string): PrimitiveVariableValidatorCallback<Date>
            {
                const errorMsg = isDefined(setName) && setName.length > 0 ?
                    `${IN}_${setName}` :
                    IN_SET;

                const test = new Set<number>(set.map(d => d.valueOf()));

                return value =>
                {
                    if (isNull(value) || !test.has(value.valueOf()))
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
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
                PrimitiveVariableValidatorCallback<T>
            {
                if (!isDefined(params))
                    params = {};

                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_NULL);
                    };
                }
                if (isUndefined(obj))
                {
                    return value =>
                    {
                        if (isUndefined(value))
                            return null;

                        return VariableValidatorState.CreateErrors(NOT_EQUAL_TO_UNDEFINED);
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

                        return VariableValidatorState.CreateErrors(errorMsg);
                    };
                }
                return value =>
                {
                    if (obj === value)
                        return null;

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotEqualTo<T>(
                obj: Nullable<DeepReadonly<T>>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    comparer?(left: Ensured<DeepReadonly<T>>, right: Ensured<DeepReadonly<T>>): boolean;
                }):
                PrimitiveVariableValidatorCallback<T>
            {
                if (!isDefined(params))
                    params = {};

                if (isNull(obj))
                {
                    return value =>
                    {
                        if (isNull(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_NULL);

                        return null;
                    };
                }
                if (isUndefined(obj))
                {
                    return value =>
                    {
                        if (isUndefined(value))
                            return VariableValidatorState.CreateErrors(EQUAL_TO_UNDEFINED);

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
                            return VariableValidatorState.CreateErrors(errorMsg);

                        return null;
                    };
                }
                return value =>
                {
                    if (obj === value)
                        return VariableValidatorState.CreateErrors(errorMsg);

                    return null;
                };
            }

            export function In<T>(
                set: ReadonlyArray<T>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    readonly setName?: string;
                }):
                PrimitiveVariableValidatorCallback<T>
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

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }

            export function NotIn<T>(
                set: ReadonlyArray<T>,
                params?: {
                    readonly stringifier?: Stringifier<T>;
                    readonly setName?: string;
                }):
                PrimitiveVariableValidatorCallback<T>
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

                    return VariableValidatorState.CreateErrors(errorMsg);
                };
            }
        }
    }
}
