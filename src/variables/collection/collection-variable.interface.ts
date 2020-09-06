import { IReadonlyCollectionVariable } from './readonly-collection-variable.interface';

export interface ICollectionVariable<TKey = any, TElement = any>
    extends
    IReadonlyCollectionVariable<TKey, TElement>
{
    add(elements: Iterable<TElement>): void;
    remove(elements: Iterable<TElement>): void;
    replace(elements: Iterable<TElement>): void;
    set(elements: Iterable<TElement>): void;
    reset(): void;
    tryRecreate(elements: Iterable<TElement>): boolean;
    recreate(elements: Iterable<TElement>): void;
    clear(): void;
}
