import React from "react";
import { useGlobalState, GlobalStateProvider } from "./state";
import { Pivot, PivotItem, loadTheme } from "office-ui-fabric-react";
import { useComposeState } from "./utils/index";
import "./App.css";

import Gallery from "./pages/gallery/index";
import NoteBook from "./pages/notebook/index";
import DataSourceBoard from "./pages/dataSource/index";
import { DarkFabric } from './styles/darkTheme';

loadTheme(DarkFabric);

const pivotList = [
  {
    title: "DataSource",
    itemKey: "pivot-" + 1
  },
  {
    title: "NoteBook",
    itemKey: "pivot-" + 2
  },
  {
    title: "Explore",
    itemKey: "pivot-" + 3
  }
];

interface PageStatus {
  show: {
    insightBoard: boolean;
    configPanel: boolean;
    fieldConfig: boolean;
    dataConfig: boolean;
  };
  current: {
    pivotKey: string;
  };
}

function App() {
  const [state, updateState] = useGlobalState();
  const [pageStatus, setPageStatus] = useComposeState<PageStatus>({
    show: {
      insightBoard: false,
      fieldConfig: false,
      configPanel: false,
      dataConfig: false
    },
    current: {
      pivotKey: pivotList[0].itemKey
    }
  });

  return (
    <div>
      <div className="header-bar">
        <div className="ms-Grid-row">
          <div className="ms-Grid-col ms-sm6 ms-md4 ms-lg1">
            <a
              href="https://github.com/ObservedObserver/visual-insights"
              className="logo"
            >
              <img src="/logo.png" />
            </a>
          </div>
          <div className="ms-Grid-col ms-sm6 ms-md8 ms-lg11">
            <Pivot
              selectedKey={pageStatus.current.pivotKey}
              onLinkClick={item => {
                item &&
                  item.props.itemKey &&
                  setPageStatus(draft => {
                    draft.current.pivotKey = item.props.itemKey!;
                  });
              }}
              headersOnly={true}
            >
              {pivotList.map(pivot => (
                <PivotItem
                  key={pivot.itemKey}
                  headerText={pivot.title}
                  itemKey={pivot.itemKey}
                />
              ))}
            </Pivot>
          </div>
        </div>
      </div>
      {pageStatus.current.pivotKey === "pivot-3" && (
        <Gallery
          subspaceList={state.subspaceList}
          dataSource={state.cookedDataSource}
          summary={state.summary}
        />
      )}
      {pageStatus.current.pivotKey === "pivot-1" && <DataSourceBoard onExtractInsights={() => {
        setPageStatus(draft => {
          draft.current.pivotKey = "pivot-3";
          draft.show.insightBoard = true;
        });
      }
      } />}
      {pageStatus.current.pivotKey === "pivot-2" && (
        <div className="content-container">
          <div className="card">
            <NoteBook
              summary={state.summary}
              subspaceList={state.subspaceList}
              dataSource={state.cookedDataSource}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function() {
  return (
    <GlobalStateProvider>
      <App />
    </GlobalStateProvider>
  );
}
