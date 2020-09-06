import { IVariableValidator } from '../variable-validator.interface';
import { CollectionVariableValidatorState } from './collection-variable-validator-state';

export interface ICollectionVariableValidator<TKey = any, TElement = any>
    extends
    IVariableValidator
{
    readonly state: CollectionVariableValidatorState<TKey, TElement>;

    getValidElements(): Iterable<TElement>;
    getInvalidElements(): Iterable<TElement>;
    getElementsWithWarnings(): Iterable<TElement>;
}
