import React, { useEffect, useState, useMemo } from 'react';
import { DefaultButton, IconButton, Stack, ProgressIndicator } from 'office-ui-fabric-react';
import PreferencePanel, { PreferencePanelConfig } from '../../components/preference';
import { useComposeState } from '../../utils/index';
import BaseChart, { Specification } from '../../demo/vegaBase';
import { DataSource, Field } from '../../global';
import { specification } from 'visual-insights';
import VisSummary from '../../plugins/visSummary/index';
import { useGlobalState } from '../../state';
import {
  Subspace,
  clusterMeasures,
  ViewSpace,
  FieldSummary
} from '../../service';

interface PageStatus {
  show: {
    insightBoard: boolean;
    configPanel: boolean;
    fieldConfig: boolean;
    dataConfig: boolean;
  }
}
interface DataView {
  schema: Specification;
  aggData: DataSource;
  fieldFeatures: Field[];
  dimensions: string[];
  measures: string[]
}

interface GalleryProps {
  subspaceList: Subspace[];
  /**
   * dataSource here should be cookedData.
   */
  dataSource: DataSource;
  summary: {
    origin: FieldSummary[];
    grouped: FieldSummary[]
  },
}

const Gallery: React.FC<GalleryProps> = (props) => {
  const { dataSource, summary, subspaceList } = props;
  const [currentPage, setCurrentPage] = useState(0);
  const [state, updateState] = useGlobalState();
  const [pageStatus, setPageStatus] = useComposeState<PageStatus>({
    show: {
      insightBoard: false,
      fieldConfig: false,
      configPanel: false,
      dataConfig: false
    }
  });
  const [visualConfig, setVisualConfig] = useState<PreferencePanelConfig>({
    aggregator: 'sum',
    defaultAggregated: true,
    defaultStack: true
  })
  const [viewSpaces, setViewSpaces] = useState<ViewSpace[]>([]);

  const [dataView, setDataView] = useState<DataView>({
    schema: {
      position: [],
      color: [],
      opacity: [],
      geomType: []
    },
    fieldFeatures: [],
    aggData: [],
    dimensions: [],
    measures: []
  });



  const gotoPage = (pageNo: number) => {
    setCurrentPage(pageNo);
  }
  
  useEffect(() => {
    updateState(draft => {
      draft.loading.gallery = true
    })
    // todo:
    // should group number be the same for different subspaces?
    clusterMeasures(state.maxGroupNumber, subspaceList.map(space => {
      return {
        dimensions: space.dimensions,
        measures: space.measures,
        matrix: space.correlationMatrix
      }
    })).then(viewSpaces => {
      setViewSpaces(viewSpaces);
      updateState(draft => {
        draft.loading.gallery = false
      })
    })
  }, [subspaceList, dataSource, state.maxGroupNumber]);
  
  const dimScores = useMemo<[string, number, number, Field][]>(() => {
    return [...summary.origin, ...summary.grouped].map(field => {
      return [field.fieldName, field.entropy, field.maxEntropy, { name: field.fieldName, type: field.type }]
    });
  }, [summary.origin, summary.grouped]);

  useEffect(() => {
    const viewState = viewSpaces[currentPage];
    if (viewState) {
      const { dimensions, measures } = viewState;
      try {
        // todo: find the strict confition instead of using try catch
        const fieldScores = dimScores.filter(field => {
          return dimensions.includes(field[0]) || measures.includes(field[0])
        })
        const { schema } = specification(fieldScores, dataSource, dimensions, measures)
        setDataView({
          schema,
          fieldFeatures: fieldScores.map(f => f[3]),
          aggData: dataSource,
          dimensions,
          measures
        })
        // ugly code
        // todo:
        // implement this in specification
        // + check geomType
        // + check geom number and aggregated geom number
        if (schema.geomType && schema.geomType.includes('point')) {
          setVisualConfig(config => {
            return {
              ...config,
              defaultAggregated: false
            }
          })
        } else {
          setVisualConfig(config => {
            return {
              ...config,
              defaultAggregated: true
            }
          })
        }
      } catch (error) {
        console.log(error)
      }
    }
  }, [viewSpaces, currentPage]);
  const currentSpace = useMemo<Subspace>(() => {
    return subspaceList.find(subspace => {
      return subspace.dimensions.join(',') === dataView.dimensions.join(',')
    })!
  }, [subspaceList, currentPage, dataView])
  return (
    <div className="content-container">
      <PreferencePanel show={pageStatus.show.configPanel}
        config={visualConfig}
        onUpdateConfig={(config) => {
          setVisualConfig(config)
          setPageStatus(draft => { draft.show.configPanel = false })
        }}
        onClose={() => { setPageStatus(draft => { draft.show.configPanel = false }) }} />
      {
          <div className="card">
          {
            (state.loading.gallery || state.loading.subspaceSearching || state.loading.univariateSummary) && <ProgressIndicator description="calculating" />
          }
          <h2 style={{marginBottom: 0}}>Visual Insights <IconButton iconProps={{iconName: 'Settings'}} ariaLabel="preference" onClick={() => { setPageStatus(draft => { draft.show.configPanel = true }) }} /></h2>
          <p className="state-description">Page No. {currentPage + 1} of {viewSpaces.length}</p>
          <p className="state-description">
            Details of the recommendation process can be seen in <b>NoteBook</b> Board. You can adjust some of the parameters and operators and see how it influence recommendation results.
          </p>
          <p className="state-description">
            Try to use the setting button beside the "visual insight" title to adjust the visualization settings to get a view you prefer better.
           </p>
          <div className="ms-Grid" dir="ltr">
            <div className="ms-Grid-row">
            <div className="ms-Grid-col ms-sm6 ms-md8 ms-lg3" style={{overflow: 'auto'}}>
              <Stack horizontal tokens={{ childrenGap: 20 }}>
                <DefaultButton text="Last" onClick={() => { gotoPage((currentPage - 1 + viewSpaces.length) % viewSpaces.length) }} allowDisabledFocus />
                <DefaultButton text="Next" onClick={() => { gotoPage((currentPage + 1) % viewSpaces.length) }} allowDisabledFocus />
              </Stack>
              <h3>Specification</h3>
              <pre style={{ color: '#e8e8e8'}}>
                {JSON.stringify(dataView.schema, null, 2)}
              </pre>
              <VisSummary dimensions={dataView.dimensions} measures={dataView.measures} dimScores={dimScores} space={currentSpace} spaceList={subspaceList} schema={dataView.schema}  />
            </div>
            <div className="ms-Grid-col ms-sm6 ms-md4 ms-lg9" style={{overflow: 'auto'}}>
              <BaseChart
                aggregator={visualConfig.aggregator}
                defaultAggregated={visualConfig.defaultAggregated}
                defaultStack={visualConfig.defaultStack}
                dimensions={dataView.dimensions}
                measures={dataView.measures}
                dataSource={dataView.aggData}
                schema={dataView.schema}
                fieldFeatures={dataView.fieldFeatures} />
            </div>
            </div>
          </div>
        </div>
      }
    </div>
  )
}

export default Gallery;