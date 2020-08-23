import { Nullable, DeepReadonly, Ensured, Stringifier } from 'frl-ts-utils/lib/types';
import { isDefined, isNull, isUndefined, isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { PrimitiveVariableValidatorDelegate } from './primitive-variable-validator-delegate';
import { VariableValidatorState } from '../variable-validator-state';

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

export namespace PrimitiveValidators
{
    export function Required<T = any>(): PrimitiveVariableValidatorDelegate<T>
    {
        return value =>
        {
            if (isDefined(value))
                return null;

            return VariableValidatorState.CreateErrors(['REQUIRED']);
        };
    }

    export function EqualTo<T>(
        obj: Nullable<DeepReadonly<T>>,
        params?: {
            readonly stringifier?: Stringifier<T>;
            comparer?(left: Ensured<DeepReadonly<T>>, right: Ensured<DeepReadonly<T>>): boolean;
        }):
        PrimitiveVariableValidatorDelegate<T>
    {
        if (!isDefined(params))
            params = {};

        if (isNull(obj))
        {
            return value =>
            {
                if (isNull(value))
                    return null;

                return VariableValidatorState.CreateErrors(['NOT_EQUAL_TO_NULL']);
            };
        }
        if (isUndefined(obj))
        {
            return value =>
            {
                if (isUndefined(value))
                    return null;

                return VariableValidatorState.CreateErrors(['NOT_EQUAL_TO_UNDEFINED']);
            };
        }
        const errorMsg = `NOT_EQUAL_TO_${isDefined(params.stringifier) ? params.stringifier(obj) : obj.toString().toUpperCase()}`;
        const comparer = params.comparer;

        if (isDefined(comparer))
        {
            return value =>
            {
                if (obj === value || (isDefined(value) && comparer(obj!, value!)))
                    return null;

                return VariableValidatorState.CreateErrors([errorMsg]);
            };
        }
        return value =>
        {
            if (obj === value)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function NotEqualTo<T>(
        obj: Nullable<DeepReadonly<T>>,
        params?: {
            readonly stringifier?: Stringifier<T>;
            comparer?(left: Ensured<DeepReadonly<T>>, right: Ensured<DeepReadonly<T>>): boolean;
        }):
        PrimitiveVariableValidatorDelegate<T>
    {
        if (!isDefined(params))
            params = {};

        if (isNull(obj))
        {
            return value =>
            {
                if (isNull(value))
                    return VariableValidatorState.CreateErrors(['EQUAL_TO_NULL']);

                return null;
            };
        }
        if (isUndefined(obj))
        {
            return value =>
            {
                if (isUndefined(value))
                    return VariableValidatorState.CreateErrors(['EQUAL_TO_UNDEFINED']);

                return null;
            };
        }
        const errorMsg = `EQUAL_TO_${isDefined(params.stringifier) ? params.stringifier(obj) : obj.toString().toUpperCase()}`;
        const comparer = params.comparer;

        if (isDefined(comparer))
        {
            return value =>
            {
                if (obj === value || (isDefined(value) && comparer(obj!, value!)))
                    return VariableValidatorState.CreateErrors([errorMsg]);

                return null;
            };
        }
        return value =>
        {
            if (obj === value)
                return VariableValidatorState.CreateErrors([errorMsg]);

            return null;
        };
    }

    export function GreaterThan(obj: number): PrimitiveVariableValidatorDelegate<number>
    {
        const errorMsg = `NOT_GREATER_THAN_${obj.toString().toUpperCase()}`;

        return value =>
        {
            if (isNull(value) || value > obj)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function LessThan(obj: number): PrimitiveVariableValidatorDelegate<number>
    {
        const errorMsg = `NOT_LESS_THAN_${obj.toString().toUpperCase()}`;

        return value =>
        {
            if (isNull(value) || value < obj)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function GreaterThanOrEqualTo(obj: number): PrimitiveVariableValidatorDelegate<number>
    {
        const errorMsg = `NOT_GREATER_THAN_OR_EQUAL_TO_${obj.toString().toUpperCase()}`;

        return value =>
        {
            if (isNull(value) || value >= obj)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function LessThanOrEqualTo(obj: number): PrimitiveVariableValidatorDelegate<number>
    {
        const errorMsg = `NOT_LESS_THAN_OR_EQUAL_TO_${obj.toString().toUpperCase()}`;

        return value =>
        {
            if (isNull(value) || value <= obj)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function Empty(): PrimitiveVariableValidatorDelegate<string>
    {
        return value =>
        {
            if (isNull(value) || value.length === 0)
                return null;

            return VariableValidatorState.CreateErrors(['NOT_EMPTY']);
        };
    }

    export function NotEmpty(): PrimitiveVariableValidatorDelegate<string>
    {
        return value =>
        {
            if (isNull(value) || value.length > 0)
                return null;

            return VariableValidatorState.CreateErrors(['EMPTY']);
        };
    }

    export function MinLength(length: number): PrimitiveVariableValidatorDelegate<string>
    {
        const errorMsg = `MIN_LENGTH_${length}_EXCEEDED`;

        return value =>
        {
            if (isNull(value) || value.length >= length)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function MaxLength(length: number): PrimitiveVariableValidatorDelegate<string>
    {
        const errorMsg = `MAX_LENGTH_${length}_EXCEEDED`;

        return value =>
        {
            if (isNull(value) || value.length <= length)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function Matches(regexp: string | RegExp, patternName?: string): PrimitiveVariableValidatorDelegate<string>
    {
        const errorMsg = isDefined(patternName) && patternName.length > 0 ?
            `PATTERN_${patternName}_NOT_MATCHED` :
            'PATTERN_NOT_MATCHED';

        return value =>
        {
            if (isNull(value))
                return null;

            const matchResult = value.match(regexp);
            if (isDefined(matchResult) && matchResult.length > 0)
                return null;

            return VariableValidatorState.CreateErrors([errorMsg]);
        };
    }

    export function NotMatches(regexp: string | RegExp, patternName?: string): PrimitiveVariableValidatorDelegate<string>
    {
        const errorMsg = isDefined(patternName) && patternName.length > 0 ?
            `PATTERN_${patternName}_MATCHED` :
            'PATTERN_MATCHED';

        return value =>
        {
            if (isNull(value))
                return null;

            const matchResult = value.match(regexp);
            if (isDefined(matchResult) && matchResult.length > 0)
                return VariableValidatorState.CreateErrors([errorMsg]);

            return null;
        };
    }

    export function AsWarnings<T = any>(delegate: PrimitiveVariableValidatorDelegate<T>): PrimitiveVariableValidatorDelegate<T>
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

    export function AsErrors<T = any>(delegate: PrimitiveVariableValidatorDelegate<T>): PrimitiveVariableValidatorDelegate<T>
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

    export function And<T>(...delegates: PrimitiveVariableValidatorDelegate<T>[]): PrimitiveVariableValidatorDelegate<T>
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

    export function Or<T>(...delegates: PrimitiveVariableValidatorDelegate<T>[]): PrimitiveVariableValidatorDelegate<T>
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
        delegate: PrimitiveVariableValidatorDelegate<T>,
        stateFactory: () => VariableValidatorState):
        PrimitiveVariableValidatorDelegate<T>
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
}
