import { createRef } from 'react';
import { getActionFromState, getStateFromPath } from '@react-navigation/native';

export const navigationRef = createRef();

export function dispatch(action) {
    navigationRef.current?.dispatch(action);
}

export function linkTo(path, config = null) {
  var state = getStateFromPath(path, config);
  var action = getActionFromState(state);
  if (action !== undefined) {
    dispatch(action);
  }
}

const useRootNavigation = () => ({
    navigationRef,
  linkTo
});

export default useRootNavigation