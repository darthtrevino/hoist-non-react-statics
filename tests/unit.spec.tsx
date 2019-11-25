/*globals describe,it,beforeEach */

import * as React from "react";
import * as PropTypes from "prop-types";
import * as createReactClass from "create-react-class";
import hoistNonReactStatics from "../src";

describe("hoist-non-react-statics", function() {
  it("should hoist non react statics", function() {
    var Component = createReactClass({
      displayName: "Foo",
      statics: {
        foo: "bar"
      },
      propTypes: {
        on: PropTypes.bool.isRequired
      },
      render: function() {
        return null;
      }
    });

    var Wrapper = createReactClass({
      displayName: "Bar",
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper.displayName).toEqual("Bar");
    expect(Wrapper.foo).toEqual("bar");
  });

  it("should not hoist custom statics", function() {
    var Component = createReactClass({
      displayName: "Foo",
      statics: {
        foo: "bar"
      },
      render: function() {
        return null;
      }
    });

    var Wrapper = createReactClass({
      displayName: "Bar",
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component, { foo: true });
    expect(Wrapper.foo).toBeUndefined();
  });

  it("should not hoist statics from strings", function() {
    var Component = "input";
    var Wrapper = createReactClass({
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component as any);
    expect(Wrapper[0]).toEqual(undefined); // if hoisting it would equal 'i'
  });

  it("should hoist symbols", function() {
    var foo = Symbol("foo");

    var Component = createReactClass({
      render: function() {
        return null;
      }
    });

    // Manually set static property using Symbol
    // since createReactClass doesn't handle symbols passed to static
    Component[foo] = "bar";

    var Wrapper = createReactClass({
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper[foo]).toEqual("bar");
  });

  it("should hoist class statics", function() {
    class Component extends React.Component {
      static foo = "bar";
      static test() {}
    }

    var Wrapper = createReactClass({
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component);

    expect(Wrapper.foo).toEqual(Component.foo);
    expect(Wrapper.test).toEqual(Component.test);
  });

  it("should hoist properties with accessor methods", function() {
    var Component = createReactClass({
      render: function() {
        return null;
      }
    });

    // Manually set static complex property
    // since createReactClass doesn't handle properties passed to static
    var counter = 0;
    Object.defineProperty(Component, "foo", {
      enumerable: true,
      configurable: true,
      get: function() {
        return counter++;
      }
    });

    var Wrapper = createReactClass({
      render: function() {
        return <Component />;
      }
    });

    hoistNonReactStatics(Wrapper, Component);

    // Each access of Wrapper.foo should increment counter.
    expect(Wrapper.foo).toEqual(0);
    expect(Wrapper.foo).toEqual(1);
    expect(Wrapper.foo).toEqual(2);
  });

  it("should inherit static class properties", () => {
    class A extends React.Component {
      static test3 = "A";
      static test4 = "D";
      test5 = "foo";
    }
    class B extends A {
      static test2 = "B";
      static test4 = "DD";
    }
    class C {
      static test1 = "C";
    }
    const D: any= hoistNonReactStatics(C as any, B);

    expect(D.test1).toEqual("C");
    expect(D.test2).toEqual("B");
    expect(D.test3).toEqual("A");
    expect(D.test4).toEqual("DD");
    expect(D.test5).toEqual(undefined);
  });

  it("should inherit static class methods", () => {
    class A extends React.Component {
      static test3 = "A";
      static test4 = "D";
      static getMeta() {
        return {};
      }
      test5 = "foo";
    }
    class B extends A {
      static test2 = "B";
      static test4 = "DD";
      static getMeta2() {
        return {};
      }
    }
    class C {
      static test1 = "C";
    }
    const D: any = hoistNonReactStatics(C as any, B);

    expect(D.test1).toEqual("C");
    expect(D.test2).toEqual("B");
    expect(D.test3).toEqual("A");
    expect(D.test4).toEqual("DD");
    expect(D.test5).toEqual(undefined);
    expect(typeof D.getMeta).toEqual("function");
    expect(typeof D.getMeta2).toEqual("function");
    expect(D.getMeta()).toEqual({});
  });

  it("should not inherit ForwardRef render", () => {
    class FancyButton extends React.Component {}
    function logProps(Component) {
      class LogProps extends React.Component {
        static foo = "foo";
        static render = "bar";
        render() {
          const { forwardedRef, ...rest } = this.props as any;
          return <Component ref={forwardedRef} {...rest} foo="foo" bar="bar" />;
        }
      }
      const ForwardedComponent = React.forwardRef((props, ref) => {
        const LP = LogProps as any
        return <LP {...props} forwardedRef={ref} />;
      });

      hoistNonReactStatics(ForwardedComponent, LogProps);

      return ForwardedComponent;
    }

    const WrappedFancyButton: any = logProps(FancyButton);

    expect(WrappedFancyButton.foo).toEqual("foo");
    expect(WrappedFancyButton.render).not.toEqual("bar");
  });

  it("should not mix defaultProps, displayName and propTypes in forwardRef", () => {
    const Component: any = React.forwardRef((props, ref) => null);
    Component.defaultProps = {
      message: "forwarded"
    };
    Component.displayName = "BaseComponent";
    Component.propTypes = {
      id: () => new Error()
    };
    Component.foo = "foo";

    const EnhancedComponent: any = React.forwardRef(({ id, ...props }: any, ref) => (
      <Component {...props} ref={ref} />
    ));
    EnhancedComponent.defaultProps = {
      id: "stop-me"
    };
    EnhancedComponent.displayName = `Enhanced(${Component.displayName})`;
    EnhancedComponent.propTypes = {
      innerRef: () => "deprecated"
    };

    hoistNonReactStatics(EnhancedComponent, Component);

    expect(EnhancedComponent.foo).toEqual("foo");
    expect(EnhancedComponent.displayName).toEqual("Enhanced(BaseComponent)");
    expect(EnhancedComponent.defaultProps.id).toEqual("stop-me");
    expect(EnhancedComponent.propTypes.innerRef()).toEqual("deprecated");
  });

  it("should not inherit Memo", () => {
    const FancyButton: any= React.memo(props => <button {...props} />);
    FancyButton.bar = "bar";

    function logProps(Component) {
      const LoggedProps: any = React.forwardRef((props, ref) => {
        return <Component {...props} ref={ref} />;
      });

      LoggedProps.compare = "compare";
      LoggedProps.foo = "foo";

      hoistNonReactStatics(LoggedProps, Component);

      return LoggedProps;
    }

    const WrappedFancyButton = logProps(FancyButton);

    expect(WrappedFancyButton.bar).toEqual("bar");
    expect(WrappedFancyButton.foo).toEqual("foo");
    expect(WrappedFancyButton.compare).toEqual("compare");
    expect(WrappedFancyButton.type).toBeUndefined();
  });
});
