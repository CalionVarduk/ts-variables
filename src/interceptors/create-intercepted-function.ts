import { Delegate, Nullable, Undefinable } from 'frl-ts-utils/lib/types';
import { isNull, reinterpretCast, isUndefined } from 'frl-ts-utils/lib/functions';

export enum FunctionInvocationStartResult
{
    Continue = 0,
    Cancel = 1
}

export type FunctionInterceptionParams<
    TFunction extends Delegate<any[], any> = Delegate<any[], any>,
    TThat = any> =
{
    readonly swallowError?: boolean;
    onInvoking?(func: TFunction, that: Nullable<TThat>, args: Parameters<TFunction>): FunctionInvocationStartResult;
    onInvoked?(func: TFunction, that: Nullable<TThat>, result?: ReturnType<TFunction>): void;
    onCancelled?(func: TFunction, that: Nullable<TThat>, args: Parameters<TFunction>): Undefinable<ReturnType<TFunction>>;
    onError?(func: TFunction, that: Nullable<TThat>, error: any): void;
};

export function createInterceptedFunction<
    TFunction extends Delegate<any[], any>,
    TThat = any>(
    func: TFunction,
    that: Nullable<TThat>,
    params: FunctionInterceptionParams<TFunction, TThat>):
    Delegate<Parameters<TFunction>, Undefinable<ReturnType<TFunction>>>
{
    if (!isNull(that))
        func = reinterpretCast<TFunction>(func.bind(that));

    const result = function(...args: Parameters<TFunction>): Undefinable<ReturnType<TFunction>>
    {
        const cancel = !isUndefined(params.onInvoking) &&
            params.onInvoking(func, that, args) === FunctionInvocationStartResult.Cancel;

        if (cancel)
        {
            if (isUndefined(params.onCancelled))
                return void(0);

            return params.onCancelled(func, that, args);
        }

        let callResult: Undefinable<ReturnType<TFunction>> = void(0);
        let callError: Undefinable<any> = void(0);
        let callFailed: boolean = false;
        try
        {
            callResult = func(...args);
        }
        catch (e)
        {
            callFailed = true;
            callError = e;
            if (params.swallowError !== false)
                throw e;
        }
        finally
        {
            if (callFailed)
            {
                if (!isUndefined(params.onError))
                    params.onError(func, that, callError);
            }
            else if (!isUndefined(params.onInvoked))
                params.onInvoked(func, that, callResult);
        }
        return callResult;
    };
    return result;
}
